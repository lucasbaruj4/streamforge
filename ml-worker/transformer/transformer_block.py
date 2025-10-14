"""
Transformer Block implementation for the mini-transformer experiments.

This module scaffolds the transformer block described in *Attention Is All You Need*
(Vaswani et al., 2017). The goal is to give you the structure so you can focus on
understanding how attention + feedforward + residual connections work together.

Key concepts you'll implement:
- Residual connections prevent vanishing gradients
- Layer normalization stabilizes training  
- Why normalization comes after addition (Post-LN vs Pre-LN)
- How attention and FFN work together in a block

Usage pattern:
    >>> from transformer_block import TransformerBlock
    >>> block = TransformerBlock(d_model=512, num_heads=8, d_ff=2048)
    >>> output = block(x)

The math behind transformer blocks:
1. Attention: x → MultiHeadAttention(x) → attention_output
2. Add & Norm: x + attention_output → LayerNorm → normalized_attention
3. FFN: normalized_attention → FeedForward → ffn_output  
4. Add & Norm: normalized_attention + ffn_output → LayerNorm → final_output
"""

from __future__ import annotations

import torch
import torch.nn as nn
from typing import Optional
from dataclasses import dataclass

from torch.nn.functional import multi_head_attention_forward

# Import your completed components
from multi_head_attention import MultiHeadAttention
from feedforward import FeedForward


@dataclass(slots=True)
class TransformerBlockConfig:
    """Configuration bundle for transformer block hyperparameters."""

    d_model: int
    num_heads: int
    d_ff: int
    dropout: float = 0.1
    activation: str = "relu"


class TransformerBlock(nn.Module):
    """
    A single Transformer block combining attention and feedforward layers.
    
    This is the fundamental building block of transformers. Each block:
    1. Applies multi-head attention to gather information from other positions
    2. Adds residual connection and layer normalization
    3. Applies feedforward network for position-wise processing
    4. Adds another residual connection and layer normalization
    
    Architecture:
    - Input: (batch_size, seq_len, d_model)
    - Attention → Add & Norm → FFN → Add & Norm
    - Output: (batch_size, seq_len, d_model)
    """
    
    def __init__(self, d_model: int, num_heads: int, d_ff: int, dropout: float = 0.1, activation: str = "relu"):
        """
        Initialize transformer block.
        
        Parameters
        ----------
        d_model : int
            Model dimension (embedding size)
        num_heads : int
            Number of attention heads
        d_ff : int
            Feedforward dimension (typically 4x d_model)
        dropout : float
            Dropout rate for regularization
        activation : str
            Activation function for FFN ("relu" or "gelu")
        """
        super().__init__()
        
        self.d_model = d_model
        self.num_heads = num_heads
        self.d_ff = d_ff
        self.attention = MultiHeadAttention(d_model, num_heads, dropout)
        self.feedforward = FeedForward(d_model, d_ff, dropout, activation)
     
        self.norm1 = nn.LayerNorm(d_model)  # After attention
        self.norm2 = nn.LayerNorm(d_model)  # After feedforward
        
        self.dropout = nn.Dropout(dropout)

    @classmethod
    def from_config(cls, config: TransformerBlockConfig) -> "TransformerBlock":
        """Construct a TransformerBlock from a dataclass config."""
        return cls(
            d_model=config.d_model,
            num_heads=config.num_heads,
            d_ff=config.d_ff,
            dropout=config.dropout,
            activation=config.activation
        )
        
    def forward(self, x: torch.Tensor, mask: Optional[torch.Tensor] = None) -> torch.Tensor:
        """
        Forward pass of transformer block.
        
        Parameters
        ----------
        x : torch.Tensor
            Input tensor of shape (batch_size, seq_len, d_model)
        mask : torch.Tensor, optional
            Attention mask to prevent attending to certain positions
            
        Returns
        -------
        torch.Tensor
            Output tensor of shape (batch_size, seq_len, d_model)
        """
        
        attention_output = self.attention(x, x, x, mask)
        normalized_attention = self.norm1(x + attention_output)
       
        ffn_output = self.feedforward(normalized_attention)
        final_output = self.norm2(ffn_output + normalized_attention)
        
        return final_output


def visualize_transformer_block_flow(block: TransformerBlock, x: torch.Tensor) -> None:
    """
    Visualize how information flows through the transformer block.
    
    This helps you understand:
    - How attention changes the input representation
    - How residual connections preserve information
    - How layer normalization affects the distribution
    """
    import matplotlib.pyplot as plt
    import numpy as np
    
    with torch.no_grad():
        # Get intermediate representations
        attention_output = block.attention(x, x, x)
        residual1 = x + attention_output
        normalized1 = block.norm1(residual1)
        
        ffn_output = block.feedforward(normalized1)
        residual2 = normalized1 + ffn_output
        final_output = block.norm2(residual2)
    
    fig, axes = plt.subplots(2, 3, figsize=(15, 10))
    
    # Plot input vs attention output
    axes[0, 0].imshow(x[0].detach().numpy(), aspect='auto', cmap='viridis')
    axes[0, 0].set_title('Input')
    axes[0, 0].set_xlabel('Model Dimension')
    axes[0, 0].set_ylabel('Sequence Position')
    
    axes[0, 1].imshow(attention_output[0].detach().numpy(), aspect='auto', cmap='viridis')
    axes[0, 1].set_title('After Attention')
    
    axes[0, 2].imshow(normalized1[0].detach().numpy(), aspect='auto', cmap='viridis')
    axes[0, 2].set_title('After Add & Norm 1')
    
    axes[1, 0].imshow(ffn_output[0].detach().numpy(), aspect='auto', cmap='viridis')
    axes[1, 0].set_title('After FFN')
    
    axes[1, 1].imshow(residual2[0].detach().numpy(), aspect='auto', cmap='viridis')
    axes[1, 1].set_title('After Add & Norm 2')
    
    axes[1, 2].imshow(final_output[0].detach().numpy(), aspect='auto', cmap='viridis')
    axes[1, 2].set_title('Final Output')
    
    plt.tight_layout()
    plt.suptitle('Transformer Block Information Flow', y=1.02)
    plt.show()


# Example usage and testing
if __name__ == "__main__":
    print("Testing Transformer Block\n")
    
    # Test parameters
    batch_size = 2
    seq_len = 8
    d_model = 512
    num_heads = 8
    d_ff = 2048
    
    print(f"Testing with:")
    print(f"  Batch size: {batch_size}")
    print(f"  Sequence length: {seq_len}")
    print(f"  Model dimension: {d_model}")
    print(f"  Number of heads: {num_heads}")
    print(f"  Feedforward dimension: {d_ff}\n")
    
    # Create transformer block
    block = TransformerBlock(d_model=d_model, num_heads=num_heads, d_ff=d_ff)
    
    # Create test input
    x = torch.randn(batch_size, seq_len, d_model)
    
    print("Input shape:")
    print(f"  x: {x.shape}\n")
    
    # Test forward pass
    try:
        output = block(x)
        print(f"✅ Transformer block output shape: {output.shape}")
        print("✅ Expected shape: (batch_size, seq_len, d_model)")
        
        # Test with causal mask
        causal_mask = torch.tril(torch.ones(seq_len, seq_len)).unsqueeze(0)
        causal_mask = causal_mask.expand(batch_size, -1, -1)
        
        output_masked = block(x, mask=causal_mask)
        print(f"✅ Masked transformer block output shape: {output_masked.shape}")
        
        # Test config-based construction
        config = TransformerBlockConfig(d_model=d_model, num_heads=num_heads, d_ff=d_ff)
        block_config = TransformerBlock.from_config(config)
        output_config = block_config(x)
        print(f"✅ Config-based output shape: {output_config.shape}")
        
    except Exception as e:
        print(f"❌ Error during forward pass: {e}")
        print("💡 Make sure to implement all TODO items first!")
    
    print("\n" + "="*60)
    print("Key Learning Points:")
    print("="*60)
    print("1. Residual connections prevent vanishing gradients")
    print("2. Layer normalization stabilizes training")
    print("3. Attention gathers information, FFN processes it")
    print("4. Each block can be stacked to build deeper networks")
    print("5. The same block works for both encoder and decoder")
    
    print("\n" + "="*60)
    print("How to Visualize Block Flow:")
    print("="*60)
    print("# Visualize information flow through the block")
    visualize_transformer_block_flow(block, x)
    print("# See how attention and FFN transform representations!")
