import torch
import torch.nn as nn
import torch.nn.functional as F
import math

def scaled_dot_product_attention(Q, K, V, mask=None):
    """
    Compute attention weights and apply them to values.
    """

    # Here we get = QK ^ T
    attention_scores = torch.matmul(Q, K.transpose(-2, -1))

    # Here we get = sqrt(d_k)
    d_k = K.size(-1)
    attention_scores = attention_scores / math.sqrt(d_k)

    # Here we apply the mask, where zero turns that score into an ultra negative
    if mask is not None:
        attention_scores = attention_scores.masked_fill(mask == 0, float('-inf'))

    # Here we turn the scores into softmax probabilities

    attention_weights = F.softmax(attention_scores, dim=-1)

    # Here we multiply the attention_scores by the actual values, getting the new 
    # contextualized embeddings that take (in the proportion of the attention_weights
    # softmax) part from the other tokens embeddings to create new contextualized
    # values

    output = torch.matmul(attention_weights, V)
    return output, attention_weights

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
