using System.Net.Http.Json;
using System.Text.Json;
using Messenger.DTO;

namespace Messenger.Services;

public class AiServiceClient(HttpClient httpClient)
{
    public async Task<AiChatResponseDto> ChatAsync(Guid userId, Guid chatId, AiChatRequestDto request, CancellationToken cancellationToken = default)
    {
        var payload = new
        {
            user_id = userId.ToString(),
            chat_id = chatId.ToString(),
            prompt = request.Prompt,
            model = request.Model,
            stream = false,
            prompt_id = request.PromptId,
            images = request.Images ?? new List<string>(),
        };

        using var response = await httpClient.PostAsJsonAsync("/ai/chat", payload, cancellationToken);
        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        if (!response.IsSuccessStatusCode)
            throw new InvalidOperationException(string.IsNullOrWhiteSpace(body) ? "AI service error" : body);

        return JsonSerializer.Deserialize<AiChatResponseDto>(body, JsonOptions()) ?? new AiChatResponseDto();
    }

    public async Task<List<Dictionary<string, object>>> GetModelsAsync(CancellationToken cancellationToken = default)
    {
        using var response = await httpClient.GetAsync("/ai/models", cancellationToken);
        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        if (!response.IsSuccessStatusCode)
            throw new InvalidOperationException(string.IsNullOrWhiteSpace(body) ? "AI service error" : body);
        return JsonSerializer.Deserialize<List<Dictionary<string, object>>>(body, JsonOptions()) ?? [];
    }

    public async Task PullModelAsync(string model, CancellationToken cancellationToken = default)
    {
        using var response = await httpClient.PostAsync($"/ai/models/pull?name={Uri.EscapeDataString(model)}", null, cancellationToken);
        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        if (!response.IsSuccessStatusCode)
            throw new InvalidOperationException(body);
    }

    public async Task DeleteModelAsync(string model, CancellationToken cancellationToken = default)
    {
        using var response = await httpClient.DeleteAsync($"/ai/models/{Uri.EscapeDataString(model)}", cancellationToken);
        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        if (!response.IsSuccessStatusCode)
            throw new InvalidOperationException(body);
    }

    public async Task<List<AiPromptDto>> GetPromptsAsync(Guid userId, bool? isGlobal = null, CancellationToken cancellationToken = default)
    {
        var query = isGlobal is null
            ? $"user_id={userId}"
            : $"user_id={userId}&is_global={isGlobal.Value.ToString().ToLowerInvariant()}";
        using var response = await httpClient.GetAsync($"/ai/prompts?{query}", cancellationToken);
        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        if (!response.IsSuccessStatusCode)
            throw new InvalidOperationException(string.IsNullOrWhiteSpace(body) ? "AI service error" : body);
        return JsonSerializer.Deserialize<List<AiPromptDto>>(body, JsonOptions()) ?? [];
    }

    public async Task<AiPromptDto> CreatePromptAsync(Guid userId, AiPromptCreateDto request, CancellationToken cancellationToken = default)
    {
        var payload = new
        {
            user_id = userId.ToString(),
            prompt = request.Prompt,
            is_global = request.IsGlobal,
        };
        using var response = await httpClient.PostAsJsonAsync("/ai/prompts", payload, cancellationToken);
        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        if (!response.IsSuccessStatusCode)
            throw new InvalidOperationException(string.IsNullOrWhiteSpace(body) ? "AI service error" : body);
        return JsonSerializer.Deserialize<AiPromptDto>(body, JsonOptions()) ?? new AiPromptDto();
    }

    public async Task DeletePromptAsync(Guid userId, int promptId, CancellationToken cancellationToken = default)
    {
        using var response = await httpClient.DeleteAsync($"/ai/prompts/{promptId}?user_id={userId}", cancellationToken);
        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        if (!response.IsSuccessStatusCode)
            throw new InvalidOperationException(body);
    }

    public async Task ResetChatSessionAsync(Guid userId, Guid chatId, CancellationToken cancellationToken = default)
    {
        var query = $"user_id={userId}&chat_id={chatId}";
        using var response = await httpClient.DeleteAsync($"/ai/chat/session?{query}", cancellationToken);
        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        if (!response.IsSuccessStatusCode)
            throw new InvalidOperationException(string.IsNullOrWhiteSpace(body) ? "AI service error" : body);
    }

    private static JsonSerializerOptions JsonOptions() => new()
    {
        PropertyNameCaseInsensitive = true,
    };
}
