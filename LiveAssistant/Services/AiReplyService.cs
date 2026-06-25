using LiveAssistant.Bridge;

namespace LiveAssistant.Services;

public class AiReplyService
{
    private readonly MessageDispatcher _dispatcher;
    private CancellationTokenSource? _cts;

    private static readonly Dictionary<EmotionTag, string[]> SampleReplies = new()
    {
        [EmotionTag.Enthusiastic] = new[] { "欢迎回来！今天状态超好～", "太棒了！这个问题问得好！", "哈哈，一起来嗨！" },
        [EmotionTag.Playful] = new[] { "哎呀，被你说中了呢～", "嘿嘿，不告诉你！", "你再猜猜看嘛～" },
        [EmotionTag.Calm] = new[] { "感谢支持，慢慢聊。", "这个问题我想一下...", "有道理，待我细说。" },
        [EmotionTag.Warm] = new[] { "谢谢老朋友捧场～", "有你们真好，真心话。", "抱抱，今天辛苦了。" },
        [EmotionTag.Witty] = new[] { "这问题角度刁钻啊！", "哈哈，角度清奇！", "妙啊，我就喜欢你这种观众。" },
        [EmotionTag.Caring] = new[] { "记得多喝水哦～", "别熬夜，身体要紧。", "你今天吃饭了吗？" }
    };

    private static readonly Dictionary<Persona, string[]> PersonaReplies = new()
    {
        [Persona.Gamer] = new[] { "感谢大哥的火箭！", "这波操作拉满！", "兄弟们冲冲冲！", "来了来了，别急！" },
        [Persona.Seller] = new[] { "这个价格真的良心！", "到手就是赚到！", "库存不多了家人！", "想要的下单就行！" },
        [Persona.Companion] = new[] { "谢谢陪伴～", "今天辛苦了，累了就歇歇。", "有你们真好。", "随便聊聊，不用拘束。" },
        [Persona.Custom] = new[] { "感谢支持！", "谢谢～谢谢大家！", "爱你哟～", "欢迎来到直播间！" }
    };

    public AiReplyService(MessageDispatcher dispatcher)
    {
        _dispatcher = dispatcher;
    }

    public async Task GenerateReplyAsync(LiveComment comment, Persona persona)
    {
        _cts?.Cancel();
        _cts = new CancellationTokenSource();

        var replies = PersonaReplies.TryGetValue(persona, out var pr) ? pr : PersonaReplies[Persona.Gamer];
        var text = replies[Random.Shared.Next(replies.Length)];

        await _dispatcher.PushAsync("ai:typing", new {
            commentId = comment.Id,
            isTyping = true
        });

        for (int i = 1; i <= text.Length; i++)
        {
            if (_cts.IsCancellationRequested) break;
            await Task.Delay(60 + Random.Shared.Next(40));
            await _dispatcher.PushAsync("ai:char", new {
                commentId = comment.Id,
                partial = text[..i],
                progress = (double)i / text.Length
            });
        }

        comment.Reply = text;

        await _dispatcher.PushAsync("ai:complete", new {
            commentId = comment.Id,
            fullText = text
        });

        // Push log entry with reply
        await _dispatcher.PushAsync("log:entry", new {
            userName = comment.UserName,
            content = comment.Content,
            filtered = comment.Filtered,
            reply = text
        });
    }

    public void CancelGeneration() { _cts?.Cancel(); }
}
