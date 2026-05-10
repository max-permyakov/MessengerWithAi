namespace Messenger
{
    public class RegisterDto
    {
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string? DisplayName { get; set; }  // Имя пользователя для отображения
        
        public string? PublicKey { get; set; }  // RSA public key for E2EE
        public string? EncryptedPrivateKey { get; set; }  // Encrypted RSA private key (encrypted with user password)
    }
}
