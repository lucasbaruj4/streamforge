"""Positional encoding utilities for the mini-transformer experiments.

This module scaffolds the sinusoidal positional encoding described in
*Attention Is All You Need* (Vaswani et al., 2017).  The goal is to give you
the ergonomic pieces (shape handling, device management, type hints) so you
can focus on the math behind the encoding itself.

Usage pattern:
    >>> from positional_encoding import positional_encoding
    >>> pe = positional_encoding(seq_len=10, d_model=16)

Key equations to implement (TODOs below) are straight from equation (3) in the
paper, where each position `pos` and embedding index `i` map to an angle:

    angle(pos, i) = pos / (10000 ** (2 * i / d_model))

Even indices (2i) use `sin(angle)`, odd indices (2i + 1) use `cos(angle)`.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional
import matplotlib.pyplot as plt

import torch


@dataclass(slots=True)
class PositionalEncodingConfig:
    """Configuration bundle so notebooks/scripts can tweak defaults easily."""

    d_model: int
    max_len: int = 5000
    device: Optional[torch.device] = None
    dtype: torch.dtype = torch.float32


def positional_encoding(
    seq_len: int,
    d_model: int,
    *,
    device: Optional[torch.device] = None,
    dtype: torch.dtype = torch.float32,
) -> torch.Tensor:
    """Create positional encodings for a given sequence length and model width.

    Parameters
    ----------
    seq_len:
        Number of positions we need to encode (sentence length, audio frames,
        etc.).
    d_model:
        Dimensionality of the model embeddings.
    device:
        Optional explicit device. Defaults to CPU if not provided.
    dtype:
        Torch dtype for the returned tensor.

    Returns
    -------
    torch.Tensor
        Tensor of shape ``(seq_len, d_model)`` ready to be added to token (or
        frame) embeddings.
    """

    config = PositionalEncodingConfig(
        d_model=d_model,
        max_len=seq_len,
        device=device,
        dtype=dtype,
    )
    return _build_sinusoidal_table(config)


def _build_sinusoidal_table(config: PositionalEncodingConfig) -> torch.Tensor:
    """Allocate tensor and delegate the math-heavy part to the human."""

    device = config.device or torch.device("cpu")

    # Positional indices column vector: shape (max_len, 1)
    positions = torch.arange(
        config.max_len, dtype=config.dtype, device=device
    ).unsqueeze(1)

    # Embedding indices for the "even" dimensions: shape (d_model/2,)
    even_dim_indices = torch.arange(
        0, config.d_model, 2, dtype=config.dtype, device=device
    )

    angle_rates = _angle_rates(even_dim_indices, config.d_model, config.dtype, device)
    angles = positions * angle_rates  # Broadcast to (max_len, d_model/2)

    # Allocate final positional encoding table filled with zeros.
    pe = torch.zeros(config.max_len, config.d_model, dtype=config.dtype, device=device)

    pe[:, 0::2] = torch.sin(angles) 
    pe[:, 1::2] = torch.cos(angles)
    return pe


def _angle_rates(
    even_dim_indices: torch.Tensor,
    d_model: int,
    dtype: torch.dtype,
    device: torch.device,
) -> torch.Tensor:
    """Compute denominator term for each pair of embedding dimensions.

    This helper exists so you can unit-test the tricky part independently:

    ```python
    >>> even_indices = torch.arange(0, 4)
    >>> _angle_rates(even_indices, d_model=8, dtype=torch.float32, device=torch.device("cpu"))
    tensor([1.0000, 0.0313])
    ``` 

    TODO(human): implement the 10000 ** (2i / d_model) denominator described in
    the Transformer paper.  The returned tensor should have shape ``(d_model/2,)``
    so that broadcasting with the position column vector works naturally.
    """


    return 1 / (10000 ** (even_dim_indices / d_model))


def add_positional_encoding(x: torch.Tensor, pe: torch.Tensor) -> torch.Tensor:
    """Utility to add (slice of) positional encodings to an input batch.

    Parameters
    ----------
    x:
        Input tensor of shape ``(batch, seq_len, d_model)``.
    pe:
        Positional encoding table of shape ``(max_len, d_model)``.  Only the first
        ``seq_len`` rows will be used.

    Returns
    -------
    torch.Tensor
        Sum of the input embeddings and the positional encodings.
    """

    if x.ndim != 3:
        raise ValueError(
            f"Expected input embeddings to have shape (batch, seq_len, d_model), got {x.shape}"
        )

    seq_len = x.size(1)
    if pe.size(0) < seq_len:
        raise ValueError(
            f"Positional encoding length {pe.size(0)} is shorter than sequence length {seq_len}"
        )

    # Broadcast positional encodings across the batch dimension.
    return x + pe[:seq_len].unsqueeze(0)


if __name__ == "__main__":
    # Quick sanity check so you can visualize values in a notebook.
    sample_pe = positional_encoding(seq_len=10, d_model=6)
    print("Sample positional encoding (first 10 positions, 6 dims):")
    print(sample_pe)

    # Plot Heatmap
    plt.figure(figsize=(8,4))
    plt.imshow(sample_pe.numpy(), aspect='auto', cmap='viridis')
    plt.colorbar(label="PE value")
    plt.xlabel("Embedding dimension")
    plt.ylabel("Position")
    plt.title("Positional Encoding (sinusoidal)")
    plt.show()
