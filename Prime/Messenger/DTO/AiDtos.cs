namespace Messenger.DTO;

public class AiChatRequestDto
{
    public string Prompt { get; set; } = string.Empty;
    public string? Model { get; set; }
    public bool Stream { get; set; } = true;
    public int? PromptId { get; set; }
    public List<string>? Images { get; set; }
}

public class AiChatResponseDto
{
    public string Content { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public int? PromptId { get; set; }
}

public class AiPromptCreateDto
{
    public string Prompt { get; set; } = string.Empty;
    public bool IsGlobal { get; set; }
}

public class AiPromptDto
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string Prompt { get; set; } = string.Empty;
    public bool IsGlobal { get; set; }
    public string? Timestamp { get; set; }
}
