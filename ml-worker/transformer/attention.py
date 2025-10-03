"""
Attention Mechanism - The Heart of Transformers

This module implements scaled dot-product attention, the fundamental
operation that revolutionized deep learning in 2017.

Key Insight: Instead of processing sequences step-by-step (RNNs),
attention allows every position to "look at" every other position
simultaneously and decide what's important.
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
import math


def scaled_dot_product_attention(Q, K, V, mask=None):
    """
    Compute attention weights and apply them to values.

    The attention mechanism answers: "For each query, which keys are most
    relevant, and what values should we extract from them?"

    Formula: Attention(Q, K, V) = softmax(QK^T / sqrt(d_k)) * V

    Args:
        Q: Query matrix (batch_size, seq_len, d_k)
           "What am I looking for?"
        K: Key matrix (batch_size, seq_len, d_k)
           "What do I contain?"
        V: Value matrix (batch_size, seq_len, d_v)
           "What information should I pass along?"
        mask: Optional mask (batch_size, seq_len, seq_len)
              Used to prevent attention to certain positions (e.g., future tokens)

    Returns:
        output: Attention-weighted values (batch_size, seq_len, d_v)
        attention_weights: The attention distribution (batch_size, seq_len, seq_len)

    Example:
        For "The cat sat", when processing "sat":
        - Query: "sat" asks "what relates to this action?"
        - Keys: ["The", "cat", "sat"] respond with their relevance
        - Attention weights might be [0.1, 0.8, 0.1] (cat is most relevant)
        - Values: Extract information from "cat" with weight 0.8
    """

    # TODO(human): Implement the attention calculation
    #
    # Step 1: Calculate attention scores
    #   - Multiply Q and K^T (transpose K)
    #   - Think: "How well does each query match each key?"
    #   - Result shape: (batch_size, seq_len, seq_len)
    #   - Hint: Use torch.matmul(Q, K.transpose(-2, -1))
    #
    # Step 2: Scale the scores
    #   - Divide by sqrt(d_k) where d_k is the dimension of keys
    #   - Why? Large dot products push softmax into regions with tiny gradients
    #   - Hint: d_k = K.size(-1), then divide scores by math.sqrt(d_k)
    #
    # Step 3: Apply mask (if provided)
    #   - Set masked positions to -infinity so softmax makes them ~0
    #   - Hint: scores = scores.masked_fill(mask == 0, float('-inf'))
    #
    # Step 4: Convert scores to probabilities
    #   - Apply softmax to get attention weights (sum to 1)
    #   - Hint: attention_weights = F.softmax(scores, dim=-1)
    #
    # Step 5: Apply attention to values
    #   - Multiply attention_weights by V to get weighted sum
    #   - Hint: output = torch.matmul(attention_weights, V)
    #
    # Return both output and attention_weights (useful for visualization)

    pass  # Remove this and implement the function


# Example usage and testing
if __name__ == "__main__":
    print("Testing Scaled Dot-Product Attention\n")

    # Small example: 2 sentences, 4 words each, 8-dimensional embeddings
    batch_size = 2
    seq_len = 4
    d_model = 8

    # Create random Q, K, V matrices (in practice, these come from learned projections)
    Q = torch.randn(batch_size, seq_len, d_model)
    K = torch.randn(batch_size, seq_len, d_model)
    V = torch.randn(batch_size, seq_len, d_model)

    print(f"Query shape: {Q.shape}")
    print(f"Key shape: {K.shape}")
    print(f"Value shape: {V.shape}\n")

    # Compute attention
    output, attention_weights = scaled_dot_product_attention(Q, K, V)

    print(f"Output shape: {output.shape}")
    print(f"Attention weights shape: {attention_weights.shape}\n")

    # Visualize attention weights for first example in batch
    print("Attention weights (first example):")
    print("Each row shows: 'This position attends to these positions'\n")
    print(attention_weights[0].detach().numpy())
    print("\nNotice:")
    print("1. Each row sums to 1.0 (probability distribution)")
    print("2. Diagonal values often high (words attend to themselves)")
    print("3. Off-diagonal shows relationships between positions")

    # Test with masking (used in decoder to prevent looking ahead)
    print("\n" + "="*60)
    print("Testing with mask (causal/autoregressive)")
    print("="*60 + "\n")

    # Create causal mask (lower triangular)
    # Position i can only attend to positions <= i
    mask = torch.tril(torch.ones(seq_len, seq_len)).unsqueeze(0).expand(batch_size, -1, -1)
    print("Mask (1 = allowed, 0 = masked):")
    print(mask[0].numpy())
    print()

    output_masked, attention_weights_masked = scaled_dot_product_attention(Q, K, V, mask)

    print("Masked attention weights (first example):")
    print(attention_weights_masked[0].detach().numpy())
    print("\nNotice:")
    print("1. Upper triangle is now ~0 (can't see future)")
    print("2. Each row still sums to 1.0")
    print("3. This is how GPT prevents 'cheating' during training")
