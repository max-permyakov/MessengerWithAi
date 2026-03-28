namespace Messenger.DTO
{
    public class ChatDetailsDto
    {
        public string Id { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty; // "direct" | "group"
        public string? Name { get; set; }
        public string CreatedAt { get; set; } = string.Empty;
        public List<ChatParticipantDto> Participants { get; set; } = new();
    }

    public class ChatParticipantDto
    {
        public string Id { get; set; } = string.Empty;
        public string Username { get; set; } = string.Empty;
        public string? DisplayName { get; set; }
        public string? AvatarUrl { get; set; }
    }
}

