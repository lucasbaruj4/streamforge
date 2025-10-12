"""
Feedforward Network implementation for the mini-transformer experiments.

This module scaffolds the feedforward network (FFN) described in
*Attention Is All You Need* (Vaswani et al., 2017). The goal is to give you
the structure and utilities so you can focus on understanding the "thinking"
layer that comes after attention.

Key concepts you'll implement:
- Position-wise feedforward network (same network applied to each position)
- Expand → Activate → Contract architecture
- Why expand to 4x dimension then contract back?
- ReLU vs GELU activation functions
- Dropout for regularization

Usage pattern:
    >>> from feedforward import FeedForward
    >>> ffn = FeedForward(d_model=512, d_ff=2048)
    >>> output = ffn(x)

The math behind feedforward networks:
1. Linear projection: x → 4x dimension (expand)
2. Activation function: ReLU or GELU
3. Linear projection: 4x → x dimension (contract)
4. Dropout for regularization
"""

from __future__ import annotations

import torch
import torch.nn as nn
import torch.nn.functional as F
from typing import Optional
from dataclasses import dataclass


@dataclass(slots=True)
class FeedForwardConfig:
    """Configuration bundle for feedforward network hyperparameters."""

    d_model: int
    d_ff: int
    dropout: float = 0.1
    activation: str = "relu"  # "relu" or "gelu"

    def __post_init__(self) -> None:
        if self.d_ff <= self.d_model:
            raise ValueError("d_ff should be larger than d_model (typically 4x)")


class FeedForward(nn.Module):
    """
    Position-wise Feed-Forward Network.
    
    This is the "thinking" layer that processes each position independently
    after attention has gathered information from other positions.
    
    Architecture:
    - Input: (batch_size, seq_len, d_model)
    - Expand: d_model → d_ff (typically 4x larger)
    - Activate: ReLU or GELU
    - Contract: d_ff → d_model
    - Dropout: for regularization
    """
    
    def __init__(self, d_model: int, d_ff: int, dropout: float = 0.1, activation: str = "relu"):
        """
        Initialize feedforward network.
        
        Parameters
        ----------
        d_model : int
            Model dimension (input and output size)
        d_ff : int
            Feedforward dimension (typically 4x d_model)
        dropout : float
            Dropout rate for regularization
        activation : str
            Activation function ("relu" or "gelu")
        """
        super().__init__()
        
        self.d_model = d_model
        self.d_ff = d_ff
        self.activation_name = activation
        
        # TODO(human): Create the two linear layers
        # Layer 1: Expand from d_model to d_ff
        self.linear1 = None  # TODO: nn.Linear(d_model, d_ff)
        
        # Layer 2: Contract from d_ff back to d_model
        self.linear2 = None  # TODO: nn.Linear(d_ff, d_model)
        
        # TODO(human): Add dropout for regularization
        self.dropout = None  # TODO: nn.Dropout(dropout)
        
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Forward pass of feedforward network.
        
        Parameters
        ----------
        x : torch.Tensor
            Input tensor of shape (batch_size, seq_len, d_model)
            
        Returns
        -------
        torch.Tensor
            Output tensor of shape (batch_size, seq_len, d_model)
        """
        # TODO(human): Step 1 - Expand dimension
        # Project from d_model to d_ff (typically 4x larger)
        expanded = None  # TODO: self.linear1(x)
        
        # TODO(human): Step 2 - Apply activation function
        # Choose between ReLU and GELU based on self.activation_name
        if self.activation_name == "relu":
            activated = None  # TODO: F.relu(expanded)
        elif self.activation_name == "gelu":
            activated = None  # TODO: F.gelu(expanded)
        else:
            raise ValueError(f"Unknown activation: {self.activation_name}")
        
        # TODO(human): Step 3 - Contract dimension
        # Project from d_ff back to d_model
        contracted = None  # TODO: self.linear2(activated)
        
        # TODO(human): Step 4 - Apply dropout
        # Apply dropout for regularization
        output = None  # TODO: self.dropout(contracted)
        
        return output
    
    @classmethod
    def from_config(cls, config: FeedForwardConfig) -> "FeedForward":
        """Construct a FeedForward from a dataclass config."""
        return cls(
            d_model=config.d_model,
            d_ff=config.d_ff,
            dropout=config.dropout,
            activation=config.activation
        )


def visualize_ffn_activations(ffn: FeedForward, x: torch.Tensor, 
                             sample_positions: Optional[list] = None) -> None:
    """
    Visualize what the feedforward network learns at different positions.
    
    This helps you understand how the FFN processes information:
    - Which positions get activated most?
    - How does the network transform representations?
    - What patterns emerge in the hidden layer?
    """
    import matplotlib.pyplot as plt
    import numpy as np
    
    if sample_positions is None:
        sample_positions = [0, 1, 2, 3]  # Show first 4 positions
    
    # Forward pass to get intermediate activations
    with torch.no_grad():
        expanded = ffn.linear1(x)
        activated = F.relu(expanded) if ffn.activation_name == "relu" else F.gelu(expanded)
        contracted = ffn.linear2(activated)
    
    fig, axes = plt.subplots(2, 2, figsize=(12, 8))
    axes = axes.flatten()
    
    for i, pos in enumerate(sample_positions):
        if i >= len(axes):
            break
            
        # Get activations for this position
        pos_activations = activated[0, pos, :].detach().numpy()
        
        # Plot activation pattern
        axes[i].bar(range(len(pos_activations)), pos_activations)
        axes[i].set_title(f'Position {pos} - FFN Activations')
        axes[i].set_xlabel('Hidden Unit')
        axes[i].set_ylabel('Activation Value')
        axes[i].set_ylim(0, None)  # ReLU activations are non-negative
    
    plt.tight_layout()
    plt.suptitle('Feedforward Network Activation Patterns', y=1.02)
    plt.show()


def compare_activations(ffn_relu: FeedForward, ffn_gelu: FeedForward, 
                       x: torch.Tensor) -> None:
    """
    Compare ReLU vs GELU activation patterns.
    
    This helps you understand the difference between:
    - ReLU: Hard cutoff at 0, sparse activations
    - GELU: Smooth activation, more continuous
    """
    import matplotlib.pyplot as plt
    
    with torch.no_grad():
        # Get activations from both networks
        relu_expanded = ffn_relu.linear1(x)
        relu_activated = F.relu(relu_expanded)
        
        gelu_expanded = ffn_gelu.linear1(x)
        gelu_activated = F.gelu(gelu_expanded)
    
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 6))
    
    # ReLU activations
    relu_flat = relu_activated[0].flatten().detach().numpy()
    ax1.hist(relu_flat, bins=50, alpha=0.7, color='blue')
    ax1.set_title('ReLU Activation Distribution')
    ax1.set_xlabel('Activation Value')
    ax1.set_ylabel('Frequency')
    ax1.axvline(x=0, color='red', linestyle='--', label='Zero threshold')
    
    # GELU activations
    gelu_flat = gelu_activated[0].flatten().detach().numpy()
    ax2.hist(gelu_flat, bins=50, alpha=0.7, color='green')
    ax2.set_title('GELU Activation Distribution')
    ax2.set_xlabel('Activation Value')
    ax2.set_ylabel('Frequency')
    ax2.axvline(x=0, color='red', linestyle='--', label='Zero threshold')
    
    plt.tight_layout()
    plt.suptitle('ReLU vs GELU Activation Patterns', y=1.02)
    plt.show()


# Example usage and testing
if __name__ == "__main__":
    print("Testing Feedforward Network\n")
    
    # Test parameters
    batch_size = 2
    seq_len = 8
    d_model = 512
    d_ff = 2048  # 4x d_model
    
    print(f"Testing with:")
    print(f"  Batch size: {batch_size}")
    print(f"  Sequence length: {seq_len}")
    print(f"  Model dimension: {d_model}")
    print(f"  Feedforward dimension: {d_ff}")
    print(f"  Expansion ratio: {d_ff / d_model}x\n")
    
    # Create feedforward network
    ffn = FeedForward(d_model=d_model, d_ff=d_ff, dropout=0.1, activation="relu")
    
    # Create test input
    x = torch.randn(batch_size, seq_len, d_model)
    
    print("Input shape:")
    print(f"  x: {x.shape}\n")
    
    # Test forward pass
    try:
        output = ffn(x)
        print(f"✅ Feedforward output shape: {output.shape}")
        print("✅ Expected shape: (batch_size, seq_len, d_model)")
        
        # Test with different activations
        ffn_gelu = FeedForward(d_model=d_model, d_ff=d_ff, activation="gelu")
        output_gelu = ffn_gelu(x)
        print(f"✅ GELU output shape: {output_gelu.shape}")
        
        # Test config-based construction
        config = FeedForwardConfig(d_model=d_model, d_ff=d_ff, activation="relu")
        ffn_config = FeedForward.from_config(config)
        output_config = ffn_config(x)
        print(f"✅ Config-based output shape: {output_config.shape}")
        
    except Exception as e:
        print(f"❌ Error during forward pass: {e}")
        print("💡 Make sure to implement all TODO items first!")
    
    print("\n" + "="*60)
    print("Key Learning Points:")
    print("="*60)
    print("1. FFN processes each position independently")
    print("2. Expand → Activate → Contract architecture")
    print("3. ReLU creates sparse activations (many zeros)")
    print("4. GELU creates smooth activations (continuous)")
    print("5. Dropout prevents overfitting during training")
    
    print("\n" + "="*60)
    print("How to Visualize FFN Patterns:")
    print("="*60)
    print("# Visualize activation patterns")
    print("visualize_ffn_activations(ffn, x)")
    print("# Compare ReLU vs GELU")
    print("compare_activations(ffn_relu, ffn_gelu, x)")
    print("# See how different positions get processed!")
