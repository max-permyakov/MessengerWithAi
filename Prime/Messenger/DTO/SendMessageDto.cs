namespace Messenger.DTO
{
    public class SendMessageDto
    {
        public string Text { get; set; } = string.Empty;
        public string? Model { get; set; }
        public int? PromptId { get; set; }
        
        // E2EE fields
        public string? EncryptedText { get; set; }  // Encrypted message text
        public string? EncryptedKey { get; set; }   // Encrypted AES key for recipient
        public string? EncryptedKeyForSender { get; set; }  // Encrypted AES key for sender
        public bool IsEncrypted { get; set; }       // Flag indicating encryption
    }
}
