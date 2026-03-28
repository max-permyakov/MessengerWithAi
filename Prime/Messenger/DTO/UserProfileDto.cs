namespace Messenger.DTO
{
    public class UserProfileDto
    {
        public string Id { get; set; } = string.Empty;
        public string Username { get; set; } = string.Empty;
        public string? DisplayName { get; set; }
        public string? Bio { get; set; }
        public string? AvatarUrl { get; set; }
        public string CreatedAt { get; set; } = string.Empty;
    }
}

