"""
Full Transformer Architecture implementation for the mini-transformer experiments.

This module scaffolds the complete transformer described in *Attention Is All You Need*
(Vaswani et al., 2017). The goal is to give you the structure so you can focus on
understanding how encoder-decoder architecture works and how to stack transformer blocks.

Key concepts you'll implement:
- Encoder: Stack of transformer blocks for processing input sequences
- Decoder: Stack of transformer blocks with masked attention for generation
- Cross-attention: Decoder attends to encoder outputs
- Embedding layers: Convert tokens to vectors and back
- Positional encoding: Add sequence position information

Usage pattern:
    >>> from transformer import Transformer
    >>> model = Transformer(vocab_size=10000, d_model=512, num_heads=8, num_layers=6)
    >>> output = model(src, tgt)

The math behind full transformers:
1. Input Embedding: tokens → vectors + positional encoding
2. Encoder: Stack of N transformer blocks (self-attention + FFN)
3. Decoder: Stack of N transformer blocks (masked self-attention + cross-attention + FFN)
4. Output: Linear projection to vocabulary size
"""

from __future__ import annotations

import torch
import torch.nn as nn
import torch.nn.functional as F
from typing import Optional, Tuple
from dataclasses import dataclass
import math
# Import your completed components
from transformer_block import TransformerBlock
from positional_encoding import positional_encoding, add_positional_encoding


@dataclass(slots=True)
class TransformerConfig:
    """Configuration bundle for full transformer hyperparameters."""

    vocab_size: int
    d_model: int
    num_heads: int
    num_layers: int
    d_ff: int
    max_seq_len: int = 5000
    dropout: float = 0.1
    activation: str = "relu"


class TransformerEncoder(nn.Module):
    """
    Transformer Encoder: Stack of transformer blocks for processing input sequences.
    
    The encoder processes the input sequence and creates rich representations
    that the decoder can attend to during generation.
    
    Architecture:
    - Input Embedding + Positional Encoding
    - Stack of N Transformer Blocks (self-attention + FFN)
    - Output: (batch_size, seq_len, d_model)
    """
    
    def __init__(self, vocab_size: int, d_model: int, num_heads: int, num_layers: int, 
                 d_ff: int, max_seq_len: int = 5000, dropout: float = 0.1, activation: str = "relu"):
        """
        Initialize transformer encoder.
        
        Parameters
        ----------
        vocab_size : int
            Size of vocabulary (number of unique tokens)
        d_model : int
            Model dimension (embedding size)
        num_heads : int
            Number of attention heads
        num_layers : int
            Number of transformer blocks to stack
        d_ff : int
            Feedforward dimension (typically 4x d_model)
        max_seq_len : int
            Maximum sequence length for positional encoding
        dropout : float
            Dropout rate for regularization
        activation : str
            Activation function for FFN ("relu" or "gelu")
        """
        super().__init__()
        
        self.d_model = d_model
        self.num_layers = num_layers
        self.embedding = nn.Embedding(vocab_size, d_model)
        
        self.register_buffer('pos_encoding', positional_encoding(max_seq_len, d_model))
        
        self.transformer_blocks = nn.ModuleList([TransformerBlock(d_model, num_heads, d_ff, dropout, activation) for n in range(num_layers)])
        
        self.dropout = nn.Dropout(dropout)
        
    
    def forward(self, src: torch.Tensor, src_mask: Optional[torch.Tensor] = None) -> torch.Tensor:
        """
        Forward pass of transformer encoder.
        
        Parameters
        ----------
        src : torch.Tensor
            Input token IDs of shape (batch_size, seq_len)
        src_mask : torch.Tensor, optional
            Attention mask to prevent attending to certain positions
            
        Returns
        -------
        torch.Tensor
            Encoded representations of shape (batch_size, seq_len, d_model)
        """
        batch_size, seq_len = src.size()
        
        # TODO(human): Implement encoder forward pass
        # 1. Convert token IDs to embeddings: src → embedding(src)
        # 2. Scale embeddings by sqrt(d_model) (common practice)
        # 3. Add positional encoding: embeddings + pos_encoding
        # 4. Apply dropout
        # 5. Pass through stack of transformer blocks
        # Hint: Each block processes the output of the previous block
        
        # Step 1: Token embeddings
        embeddings = self.embedding(src)
        
        # Step 2: Scale embeddings
        scaled_embeddings = embeddings * math.sqrt(d_model)
        
        # Step 3: Add positional encoding
        x = None
        
        # Step 4: Apply dropout
        x = None
        
        # Step 5: Pass through transformer blocks
        for block in self.transformer_blocks:
            x = None  # TODO(human): Apply transformer block with src_mask
        
        return x


class TransformerDecoder(nn.Module):
    """
    Transformer Decoder: Stack of transformer blocks with masked attention for generation.
    
    The decoder generates output sequences by attending to:
    1. Previous decoder outputs (masked self-attention)
    2. Encoder outputs (cross-attention)
    
    Architecture:
    - Input Embedding + Positional Encoding
    - Stack of N Transformer Blocks (masked self-attention + cross-attention + FFN)
    - Output: (batch_size, seq_len, d_model)
    """
    
    def __init__(self, vocab_size: int, d_model: int, num_heads: int, num_layers: int, 
                 d_ff: int, max_seq_len: int = 5000, dropout: float = 0.1, activation: str = "relu"):
        """
        Initialize transformer decoder.
        
        Parameters
        ----------
        vocab_size : int
            Size of vocabulary (number of unique tokens)
        d_model : int
            Model dimension (embedding size)
        num_heads : int
            Number of attention heads
        num_layers : int
            Number of transformer blocks to stack
        d_ff : int
            Feedforward dimension (typically 4x d_model)
        max_seq_len : int
            Maximum sequence length for positional encoding
        dropout : float
            Dropout rate for regularization
        activation : str
            Activation function for FFN ("relu" or "gelu")
        """
        super().__init__()
        
        self.d_model = d_model
        self.num_layers = num_layers
        
        # TODO(human): Initialize input embedding layer
        # Hint: Same as encoder - nn.Embedding(vocab_size, d_model)
        self.embedding = None
        
        # TODO(human): Initialize positional encoding
        # Hint: Same as encoder - create buffer for positional encodings
        self.register_buffer('pos_encoding', None)
        
        # TODO(human): Initialize stack of transformer blocks
        # Hint: Use nn.ModuleList to store multiple TransformerBlock instances
        # Each block will handle both self-attention and cross-attention
        self.transformer_blocks = None
        
        # TODO(human): Initialize dropout for regularization
        self.dropout = None
        
        # Initialize positional encoding
        self._init_positional_encoding(max_seq_len, d_model)
    
    def _init_positional_encoding(self, max_seq_len: int, d_model: int) -> None:
        """Initialize positional encoding table."""
        # TODO(human): Create positional encoding table
        # Hint: Same as encoder - use your positional_encoding function
        pe = None
        self.register_buffer('pos_encoding', pe)
    
    def forward(self, tgt: torch.Tensor, memory: torch.Tensor, 
                tgt_mask: Optional[torch.Tensor] = None, 
                memory_mask: Optional[torch.Tensor] = None) -> torch.Tensor:
        """
        Forward pass of transformer decoder.
        
        Parameters
        ----------
        tgt : torch.Tensor
            Target token IDs of shape (batch_size, tgt_seq_len)
        memory : torch.Tensor
            Encoder outputs of shape (batch_size, src_seq_len, d_model)
        tgt_mask : torch.Tensor, optional
            Causal mask to prevent looking ahead in target sequence
        memory_mask : torch.Tensor, optional
            Attention mask for encoder outputs
            
        Returns
        -------
        torch.Tensor
            Decoded representations of shape (batch_size, tgt_seq_len, d_model)
        """
        batch_size, tgt_seq_len = tgt.size()
        
        # TODO(human): Implement decoder forward pass
        # 1. Convert target token IDs to embeddings
        # 2. Scale embeddings by sqrt(d_model)
        # 3. Add positional encoding
        # 4. Apply dropout
        # 5. Pass through stack of transformer blocks
        # Hint: Each block needs tgt (for self-attention) and memory (for cross-attention)
        
        # Step 1: Target embeddings
        embeddings = None
        
        # Step 2: Scale embeddings
        scaled_embeddings = None
        
        # Step 3: Add positional encoding
        x = None
        
        # Step 4: Apply dropout
        x = None
        
        # Step 5: Pass through transformer blocks
        for block in self.transformer_blocks:
            # TODO(human): Apply transformer block
            # Hint: The block needs to handle both self-attention (tgt_mask) 
            # and cross-attention to memory (memory_mask)
            x = None
        
        return x


class Transformer(nn.Module):
    """
    Complete Transformer model with encoder-decoder architecture.
    
    This is the full transformer that can be used for sequence-to-sequence tasks
    like translation, summarization, or any task that maps input sequences to output sequences.
    
    Architecture:
    - Encoder: Processes input sequence
    - Decoder: Generates output sequence attending to encoder
    - Output Projection: Maps decoder outputs to vocabulary
    """
    
    def __init__(self, vocab_size: int, d_model: int, num_heads: int, num_layers: int, 
                 d_ff: int, max_seq_len: int = 5000, dropout: float = 0.1, activation: str = "relu"):
        """
        Initialize complete transformer model.
        
        Parameters
        ----------
        vocab_size : int
            Size of vocabulary (number of unique tokens)
        d_model : int
            Model dimension (embedding size)
        num_heads : int
            Number of attention heads
        num_layers : int
            Number of transformer blocks in encoder and decoder
        d_ff : int
            Feedforward dimension (typically 4x d_model)
        max_seq_len : int
            Maximum sequence length for positional encoding
        dropout : float
            Dropout rate for regularization
        activation : str
            Activation function for FFN ("relu" or "gelu")
        """
        super().__init__()
        
        self.vocab_size = vocab_size
        self.d_model = d_model
        self.num_layers = num_layers
        
        # TODO(human): Initialize encoder
        # Hint: Use your TransformerEncoder class
        self.encoder = None
        
        # TODO(human): Initialize decoder
        # Hint: Use your TransformerDecoder class
        self.decoder = None
        
        # TODO(human): Initialize output projection
        # Hint: nn.Linear(d_model, vocab_size)
        # This maps decoder outputs back to vocabulary logits
        self.output_projection = None
        
        # TODO(human): Initialize dropout for regularization
        self.dropout = None
    
    @classmethod
    def from_config(cls, config: TransformerConfig) -> "Transformer":
        """Construct a Transformer from a dataclass config."""
        return cls(
            vocab_size=config.vocab_size,
            d_model=config.d_model,
            num_heads=config.num_heads,
            num_layers=config.num_layers,
            d_ff=config.d_ff,
            max_seq_len=config.max_seq_len,
            dropout=config.dropout,
            activation=config.activation
        )
    
    def forward(self, src: torch.Tensor, tgt: torch.Tensor, 
                src_mask: Optional[torch.Tensor] = None,
                tgt_mask: Optional[torch.Tensor] = None) -> torch.Tensor:
        """
        Forward pass of complete transformer.
        
        Parameters
        ----------
        src : torch.Tensor
            Source token IDs of shape (batch_size, src_seq_len)
        tgt : torch.Tensor
            Target token IDs of shape (batch_size, tgt_seq_len)
        src_mask : torch.Tensor, optional
            Attention mask for source sequence
        tgt_mask : torch.Tensor, optional
            Causal mask for target sequence
            
        Returns
        -------
        torch.Tensor
            Output logits of shape (batch_size, tgt_seq_len, vocab_size)
        """
        
        # TODO(human): Implement complete transformer forward pass
        # 1. Encode source sequence: src → encoder(src, src_mask)
        # 2. Decode target sequence: tgt, encoder_output → decoder(tgt, encoder_output, tgt_mask)
        # 3. Project to vocabulary: decoder_output → output_projection(decoder_output)
        # 4. Return logits for next token prediction
        
        # Step 1: Encode source
        encoder_output = None
        
        # Step 2: Decode target
        decoder_output = None
        
        # Step 3: Project to vocabulary
        logits = None
        
        return logits
    
    def generate(self, src: torch.Tensor, max_length: int = 100, 
                 src_mask: Optional[torch.Tensor] = None) -> torch.Tensor:
        """
        Generate output sequence using the transformer.
        
        This implements autoregressive generation where the model predicts
        one token at a time, using previous predictions as input.
        
        Parameters
        ----------
        src : torch.Tensor
            Source token IDs of shape (batch_size, src_seq_len)
        max_length : int
            Maximum length of generated sequence
        src_mask : torch.Tensor, optional
            Attention mask for source sequence
            
        Returns
        -------
        torch.Tensor
            Generated token IDs of shape (batch_size, max_length)
        """
        
        # TODO(human): Implement autoregressive generation
        # 1. Encode source sequence once
        # 2. Start with empty target sequence
        # 3. For each position, predict next token
        # 4. Use causal mask to prevent looking ahead
        # 5. Stop when max_length reached or special token found
        
        batch_size = src.size(0)
        device = src.device
        
        # Step 1: Encode source (do this once)
        encoder_output = None
        
        # Step 2: Initialize target sequence
        tgt = None  # TODO(human): Start with empty sequence or special start token
        
        # Step 3: Generate tokens one by one
        for i in range(max_length):
            # TODO(human): Create causal mask for current sequence
            tgt_mask = None
            
            # TODO(human): Decode current target sequence
            decoder_output = None
            
            # TODO(human): Get logits for next token
            logits = None
            
            # TODO(human): Sample next token (greedy or temperature sampling)
            next_token = None
            
            # TODO(human): Append to target sequence
            tgt = None
            
            # TODO(human): Check for stopping condition (end token)
            # if next_token == end_token_id:
            #     break
        
        return tgt


def create_causal_mask(seq_len: int, device: torch.device) -> torch.Tensor:
    """
    Create causal mask for autoregressive generation.
    
    This prevents the model from looking at future tokens during training
    and generation.
    
    Parameters
    ----------
    seq_len : int
        Length of the sequence
    device : torch.device
        Device to create tensor on
        
    Returns
    -------
    torch.Tensor
        Causal mask of shape (seq_len, seq_len)
    """
    # TODO(human): Implement causal mask creation
    # Hint: Lower triangular matrix of ones
    # Position i can only attend to positions <= i
    mask = None
    return mask


# Example usage and testing
if __name__ == "__main__":
    print("Testing Full Transformer Architecture\n")
    
    # Test parameters
    batch_size = 2
    src_seq_len = 10
    tgt_seq_len = 8
    vocab_size = 1000
    d_model = 512
    num_heads = 8
    num_layers = 6
    d_ff = 2048
    
    print(f"Testing with:")
    print(f"  Batch size: {batch_size}")
    print(f"  Source sequence length: {src_seq_len}")
    print(f"  Target sequence length: {tgt_seq_len}")
    print(f"  Vocabulary size: {vocab_size}")
    print(f"  Model dimension: {d_model}")
    print(f"  Number of heads: {num_heads}")
    print(f"  Number of layers: {num_layers}")
    print(f"  Feedforward dimension: {d_ff}\n")
    
    # Create transformer model
    model = Transformer(
        vocab_size=vocab_size,
        d_model=d_model,
        num_heads=num_heads,
        num_layers=num_layers,
        d_ff=d_ff
    )
    
    # Create test inputs
    src = torch.randint(0, vocab_size, (batch_size, src_seq_len))
    tgt = torch.randint(0, vocab_size, (batch_size, tgt_seq_len))
    
    print("Input shapes:")
    print(f"  src: {src.shape}")
    print(f"  tgt: {tgt.shape}\n")
    
    # Test forward pass
    try:
        logits = model(src, tgt)
        print(f"✅ Transformer output shape: {logits.shape}")
        print("✅ Expected shape: (batch_size, tgt_seq_len, vocab_size)")
        
        # Test with masks
        src_mask = torch.ones(batch_size, src_seq_len, src_seq_len)
        tgt_mask = create_causal_mask(tgt_seq_len, src.device)
        tgt_mask = tgt_mask.unsqueeze(0).expand(batch_size, -1, -1)
        
        logits_masked = model(src, tgt, src_mask=src_mask, tgt_mask=tgt_mask)
        print(f"✅ Masked transformer output shape: {logits_masked.shape}")
        
        # Test generation
        generated = model.generate(src, max_length=20)
        print(f"✅ Generated sequence shape: {generated.shape}")
        print("✅ Expected shape: (batch_size, max_length)")
        
        # Test config-based construction
        config = TransformerConfig(
            vocab_size=vocab_size,
            d_model=d_model,
            num_heads=num_heads,
            num_layers=num_layers,
            d_ff=d_ff
        )
        model_config = Transformer.from_config(config)
        logits_config = model_config(src, tgt)
        print(f"✅ Config-based output shape: {logits_config.shape}")
        
    except Exception as e:
        print(f"❌ Error during forward pass: {e}")
        print("💡 Make sure to implement all TODO items first!")
    
    print("\n" + "="*60)
    print("Key Learning Points:")
    print("="*60)
    print("1. Encoder processes input sequence with self-attention")
    print("2. Decoder generates output with masked self-attention + cross-attention")
    print("3. Stacking blocks creates deeper representations")
    print("4. Causal masking prevents looking ahead during generation")
    print("5. This architecture powers GPT, BERT, and modern language models")
    
    print("\n" + "="*60)
    print("Next Steps:")
    print("="*60)
    print("1. Implement encoder and decoder initialization")
    print("2. Build the complete forward pass")
    print("3. Add autoregressive generation")
    print("4. Test with real data and training loop")
    print("5. Ready for audio processing and Whisper integration!")
