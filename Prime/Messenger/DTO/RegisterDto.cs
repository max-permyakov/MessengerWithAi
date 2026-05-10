namespace Messenger
{
    public class RegisterDto
    {
        public string Username { get; set; } = string.Empty;


        public string Password { get; set; } = string.Empty;
        
        public string? PublicKey { get; set; }  // RSA public key for E2EE
    }
}
