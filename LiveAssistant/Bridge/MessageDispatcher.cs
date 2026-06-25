using System.Text.Json;

namespace LiveAssistant.Bridge;

public class MessageDispatcher
{
    private readonly Dictionary<string, Func<JsonElement, Task<object?>>> _handlers = new();
    private readonly MainWindow _window;

    public MessageDispatcher(MainWindow window)
    {
        _window = window;
    }

    public void Register(string messageType, Func<JsonElement, Task<object?>> handler)
    {
        _handlers[messageType] = handler;
    }

    public async Task DispatchAsync(string rawJson)
    {
        try
        {
            var envelope = JsonSerializer.Deserialize<JsMessage>(rawJson,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            if (envelope == null || string.IsNullOrEmpty(envelope.Type))
                return;

            if (_handlers.TryGetValue(envelope.Type, out var handler))
            {
                var result = await handler(envelope.Data ?? default);
                var response = new CSharpMessage(
                    $"{envelope.Type}:response",
                    result);
                var json = JsonSerializer.Serialize(response,
                    new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
                await _window.InvokeJsAsync("onCSharpMessage", json);
            }
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"Dispatch error: {ex.Message}");
        }
    }

    public async Task PushAsync(string type, object? data)
    {
        var msg = new CSharpMessage(type, data);
        var json = JsonSerializer.Serialize(msg,
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
        await _window.InvokeJsAsync("onCSharpMessage", json);
    }
}
