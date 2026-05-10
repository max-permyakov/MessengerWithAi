namespace Messenger.Models
{
    public class Message
    {
        public Guid Id { get; set; }                // PK
        public Guid ChatId { get; set; }            // FK → Chat
        public Guid SenderId { get; set; }          // FK → User

        public string Text { get; set; } = null!;
        public string Role { get; set; } = "user";
        public bool IsAi { get; set; }
        public string? ModelName { get; set; }
        public int? PromptId { get; set; }
        
        // E2EE fields
        public string? EncryptedText { get; set; }      // Encrypted message text (base64)
        public string? EncryptedKey { get; set; }       // Encrypted AES key for recipient (base64)
        public string? EncryptedKeyForSender { get; set; }  // Encrypted AES key for sender (base64)
        public bool IsEncrypted { get; set; }           // Flag indicating if message is encrypted
        
        public string? FileName { get; set; }
        public string? FilePath { get; set; }
        public string? FileContentType { get; set; }
        public long? FileSize { get; set; }
        public DateTime CreatedAt { get; set; }

        public Chat Chat { get; set; } = null!;
        public User Sender { get; set; } = null!;
    }
}

