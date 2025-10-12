"""
Multi-Head Attention implementation for the mini-transformer experiments.

This module scaffolds the multi-head attention mechanism described in
*Attention Is All You Need* (Vaswani et al., 2017). The goal is to give you
the structure and utilities so you can focus on understanding how multiple
attention heads work in parallel.

Key concepts you'll implement:
- Split d_model into num_heads parallel attention mechanisms
- Each head learns different types of relationships (syntax, semantics, etc.)
- Concatenate all head outputs and project back to d_model
- Why 8 heads instead of 1? (different linguistic patterns)

Usage pattern:
    >>> from multi_head_attention import MultiHeadAttention
    >>> mha = MultiHeadAttention(d_model=512, num_heads=8)
    >>> output = mha(Q, K, V, mask=None)

The math behind multi-head attention:
1. Split Q, K, V into num_heads parallel heads
2. Apply scaled dot-product attention to each head
3. Concatenate all head outputs
4. Project back to d_model dimension
"""

from __future__ import annotations

import torch
import torch.nn as nn
import torch.nn.functional as F
import math
from typing import Optional
from dataclasses import dataclass

# Import your completed attention mechanism
from attention import scaled_dot_product_attention


@dataclass(slots=True)
class MultiHeadAttentionConfig:
    """Configuration bundle for multi-head attention hyperparameters.

    Using a dataclass keeps construction ergonomic while avoiding mixing
    dataclasses directly with nn.Module internals.
    """

    d_model: int
    num_heads: int
    dropout: float = 0.1

    def __post_init__(self) -> None:
        if self.d_model % self.num_heads != 0:
            raise ValueError("d_model must be divisible by num_heads")


class MultiHeadAttention(nn.Module):
    """
    Multi-Head Attention mechanism that runs multiple attention heads in parallel.
    
    Each head can learn different types of relationships:
    - Head 1 might focus on syntax (subject-verb relationships)
    - Head 2 might focus on semantics (word meanings)
    - Head 3 might focus on long-range dependencies
    - etc.
    """
    
    def __init__(self, d_model: int, num_heads: int, dropout: float = 0.1):
        """
        Initialize multi-head attention.
        
        Parameters
        ----------
        d_model : int
            Model dimension (embedding size)
        num_heads : int
            Number of parallel attention heads
        dropout : float
            Dropout rate for regularization
        """
        super().__init__()
        
        self.d_model = d_model
        self.num_heads = num_heads
        self.d_k = d_model // num_heads  
        
        self.W_q = nn.Linear(d_model, d_model)  
        self.W_k = nn.Linear(d_model, d_model)  
        self.W_v = nn.Linear(d_model, d_model)
        
       
        self.W_o = nn.Linear(d_model, d_model)  
        
    
        self.dropout = nn.Dropout(dropout)  

    @classmethod
    def from_config(cls, config: MultiHeadAttentionConfig) -> "MultiHeadAttention":
        """Construct a MultiHeadAttention from a dataclass config.

        This preserves nn.Module semantics while letting you pass a single
        object around in training scripts/notebooks.
        """
        return cls(d_model=config.d_model, num_heads=config.num_heads, dropout=config.dropout)
        
    def forward(self, Q_input: torch.Tensor, K_input: torch.Tensor, V_input: torch.Tensor, 
                mask: Optional[torch.Tensor] = None, return_attention: bool = False) -> torch.Tensor:
        """
        Forward pass of multi-head attention.
        
        Parameters
        ----------
        Q_input, K_input, V_input : torch.Tensor
            Query, Key, Value tensors of shape (batch_size, seq_len, d_model)
        mask : torch.Tensor, optional
            Attention mask to prevent attending to certain positions
        return_attention : bool, optional
            Whether to return attention weights for visualization
            
        Returns
        -------
        torch.Tensor or tuple
            Output of shape (batch_size, seq_len, d_model)
            If return_attention=True, also returns attention weights of shape (batch_size, num_heads, seq_len, seq_len)
        """
        batch_size, seq_len, d_model = Q_input.size()
        
        
        Q = self.W_q(Q_input)
        K = self.W_k(K_input)
        V = self.W_v(V_input)
        
       
        Q_heads = Q.view(batch_size, seq_len, self.num_heads, self.d_k).transpose(1, 2)
        K_heads = K.view(batch_size, seq_len, self.num_heads,self.d_k).transpose(1, 2)
        V_heads = V.view(batch_size, seq_len, self.num_heads, self.d_k).transpose(1, 2)
        
        attention_outputs = []
        all_attention_weights = []  # Collect attention weights for visualization
        
        for head in range(self.num_heads):
            Q_head = Q_heads[:, head, :, :]  
            K_head = K_heads[:, head, :, :]
            V_head = V_heads[:, head, :, :]
            
            head_output, head_weights = scaled_dot_product_attention(Q_head, K_head, V_head, mask)  
            attention_outputs.append(head_output)
            all_attention_weights.append(head_weights)
        
        concatenated = torch.cat(attention_outputs, dim=-1)  
        
        output = self.W_o(concatenated)  
        output = self.dropout(output)  
        
        if return_attention:
            # Stack attention weights: (batch_size, num_heads, seq_len, seq_len)
            attention_weights = torch.stack(all_attention_weights, dim=1)
            return output, attention_weights
        else:
            return output
    
    def _create_head_mask(self, mask: torch.Tensor) -> torch.Tensor:
        """
        Helper to reshape mask for multi-head attention.
        
        Parameters
        ----------
        mask : torch.Tensor
            Original mask of shape (batch_size, seq_len, seq_len)
            
        Returns
        -------
        torch.Tensor
            Reshaped mask for multi-head processing
        """
        if mask is None:
            return None
            
        return mask.unsqueeze(1)  


def visualize_attention_heads(attention_weights: torch.Tensor, 
                           head_names: Optional[list] = None) -> None:
    """
    Visualize what different attention heads are learning.
    
    This helps you understand how different heads specialize:
    - Some heads might focus on adjacent words (local syntax)
    - Others might focus on long-range dependencies
    - Some might learn subject-verb relationships
    """
    import matplotlib.pyplot as plt
    
    # Get dimensions from the tensor itself
    batch_size, num_heads, seq_len, _ = attention_weights.shape
    
    if head_names is None:
        head_names = [f"Head {i+1}" for i in range(num_heads)]
    
    fig, axes = plt.subplots(2, 4, figsize=(16, 8))
    axes = axes.flatten()
    
    for head in range(min(num_heads, 8)):  
        head_weights = attention_weights[0, head, :, :].detach().numpy()  
        
        im = axes[head].imshow(head_weights, cmap='Blues', aspect='auto')
        axes[head].set_title(f'{head_names[head]}')
        axes[head].set_xlabel('Key Position')
        axes[head].set_ylabel('Query Position')
        plt.colorbar(im, ax=axes[head])
    
    plt.tight_layout()
    plt.suptitle('Multi-Head Attention Patterns', y=1.02)
    plt.show()


# Example usage and testing
if __name__ == "__main__":
    print("Testing Multi-Head Attention\n")
    
    # Test parameters
    batch_size = 2
    seq_len = 8
    d_model = 512
    num_heads = 8
    
    print(f"Testing with:")
    print(f"  Batch size: {batch_size}")
    print(f"  Sequence length: {seq_len}")
    print(f"  Model dimension: {d_model}")
    print(f"  Number of heads: {num_heads}")
    print(f"  Head dimension: {d_model // num_heads}\n")
    
    # Create multi-head attention module
    mha = MultiHeadAttention(d_model=d_model, num_heads=num_heads)
    
    # Create test inputs
    Q = torch.randn(batch_size, seq_len, d_model)
    K = torch.randn(batch_size, seq_len, d_model)
    V = torch.randn(batch_size, seq_len, d_model)
    
    print("Input shapes:")
    print(f"  Q: {Q.shape}")
    print(f"  K: {K.shape}")
    print(f"  V: {V.shape}\n")
    
    # Test forward pass
    try:
        output = mha(Q, K, V)
        print(f"✅ Multi-head attention output shape: {output.shape}")
        print("✅ Expected shape: (batch_size, seq_len, d_model)")
        
        # Test with attention weights for visualization
        output_with_weights, attention_weights = mha(Q, K, V, return_attention=True)
        print(f"✅ Attention weights shape: {attention_weights.shape}")
        print("✅ Expected shape: (batch_size, num_heads, seq_len, seq_len)")
        
        # Test with causal mask
        causal_mask = torch.tril(torch.ones(seq_len, seq_len)).unsqueeze(0)
        causal_mask = causal_mask.expand(batch_size, -1, -1)
        
        output_masked = mha(Q, K, V, mask=causal_mask)
        print(f"✅ Masked attention output shape: {output_masked.shape}")
        
        # Example of how to visualize (uncomment to see plots)
        print("\n🎨 Visualizing attention patterns...")
        visualize_attention_heads(attention_weights)
        
    except Exception as e:
        print(f"❌ Error during forward pass: {e}")
        print("💡 Make sure to implement all TODO items first!")
    
    print("\n" + "="*60)
    print("Key Learning Points:")
    print("="*60)
    print("1. Each head learns different attention patterns")
    print("2. Heads can specialize in syntax, semantics, long-range deps")
    print("3. Parallel processing makes training efficient")
    print("4. Concatenation preserves information from all heads")
    print("5. Output projection learns how to combine head outputs")
    
    print("\n" + "="*60)
    print("How to Visualize Attention Patterns:")
    print("="*60)
    print("# Get attention weights")
    print("output, attention_weights = mha(Q, K, V, return_attention=True)")
    print("# Visualize what each head learns")
    print("visualize_attention_heads(attention_weights)")
    print("# Each head will show different attention patterns!")