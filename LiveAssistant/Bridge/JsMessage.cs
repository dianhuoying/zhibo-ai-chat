using System.Text.Json;

namespace LiveAssistant.Bridge;

public record JsMessage(string Type, JsonElement? Data);
public record CSharpMessage(string Type, object? Data);
