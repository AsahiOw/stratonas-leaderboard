# Kei Greeting Voice Script (Japanese, for Fish Audio S2)

Japanese voice lines for the greeting toast, one-to-one with the dialogue in
[`src/components/GreetingToast.tsx`](src/components/GreetingToast.tsx).

Kei's personality: **tsundere** — hot-headed, caring, protective, easily flustered.
Each line is written in that voice (stammering, "べ、別に…", "ふん", soft worry).

## How to use

- Paste a single Japanese line (tags included) into Fish Audio S2.
- Tags in `[ ]` are Fish Audio S2 open-domain audio tags (see screenshot). Only the
  tags listed below are used here so they all render:
  - **Emotional tone:** `[angry]` `[sad]` `[embarrassed]` `[emphasis]` `[whispering]` `[soft]` `[breathy]` `[excited]`
  - **Audio effects:** `[sighing]` `[pause]` `[long pause]`
- `[pause]` / `[long pause]` map to the "…" beats in the original lines.

## Video expression mapping (tone guide)

| Video | Expression | Default tag flavor |
|-------|------------|--------------------|
| Kei1 | turns around, shy + surprised | `[embarrassed]` + a surprised beat |
| Kei2 | honest, worried | `[soft]` / `[sad]` / `[sighing]` |
| Kei3 | light excitement, still shy | `[excited]` + `[embarrassed]` |
| Kei4 | book to mouth, brief | short, `[soft]` |
| Kei5 | book to mouth, long (~7s) | longer, `[pause]` beats |

---

## Time of day

### Dawn (05:00–08:00)

**Kei3** — *You are up this early? ...G-good. Not that I was waiting, Sensei.*
> [excited]こんなに早起きなの、先生？[pause][embarrassed]べ、別に待ってたわけじゃないんだから。

**Kei1** — *Oh— you startled me. Morning, Sensei.*
> [embarrassed]わっ…びっくりさせないでよ。[soft]おはよう、先生。

**Kei2** — *Do not skip breakfast just to check rankings, Sensei.*
> [soft]ランキングを見るために朝ごはんを抜いちゃだめだからね、先生。

**Kei1** — *The sunrise is nice... n-not that I woke up to see it with you, Sensei.*
> [soft]朝日、綺麗だね…[embarrassed]べ、別に先生と一緒に見るために起きたわけじゃ…ないし。

**Kei2** — *Tea is ready. ...I made extra, for efficiency, Sensei.*
> [soft]お茶、入れておいたよ。[pause]…多めに作っただけ。効率のためよ、先生。

**Kei3** — *Up before the others, huh. ...Impressive, I suppose, Sensei.*
> [excited]みんなより早起きなんだ。[embarrassed]…まあ、ちょっとは感心したけど、先生。

### Morning (08:00–12:00)

**Kei4** — *You are back. ...Welcome, Sensei.*
> [soft]戻ったんだ。[pause]…おかえり、先生。

**Kei3** — *Morning, Sensei. The standings will not read themselves, you know.*
> [excited]おはよう、先生。[emphasis]順位は勝手に読んでくれないんだからね。

**Kei1** — *O-oh, it is you. Good morning, Sensei.*
> [embarrassed]お、おはよう…先生だったんだ。おはよう。

**Kei1** — *There you are. I was about to start without you, Sensei.*
> [embarrassed]やっと来た。[soft]先生抜きで始めるところだったんだから。

**Kei2** — *Have you stretched yet? ...Sitting all day is bad for you, Sensei.*
> [soft]ちゃんとストレッチした？[pause]ずっと座ってると体に悪いよ、先生。

**Kei4** — *Let us make today count, Sensei.*
> [soft]今日も頑張ろうね、先生。

### Afternoon (12:00–17:00)

**Kei4** — *Afternoon, Sensei.*
> [soft]こんにちは、先生。

**Kei2** — *Did you even eat lunch? ...Honestly, Sensei.*
> [soft]お昼、ちゃんと食べた？[sighing]まったく、先生は。

**Kei1** — *Hmph, took you long enough. Afternoon, Sensei.*
> [embarrassed]ふん、遅かったじゃない。[soft]こんにちは、先生。

**Kei3** — *Halfway through the day. Keep it up, Sensei.*
> [excited]もう一日の半分だね。その調子だよ、先生。

**Kei2** — *You look tired. ...Take a break, that is an order, Sensei.*
> [soft]疲れた顔してる。[emphasis]休憩しなさい。これは命令だからね、先生。

**Kei1** — *Back so soon? ...Hmph. I do not mind, Sensei.*
> [embarrassed]もう戻ってきたの？[soft]…ふん。別に、嫌じゃないけど、先生。

### Evening (17:00–21:00)

**Kei4** — *Good evening, Sensei.*
> [soft]こんばんは、先生。

**Kei2** — *You worked hard today. ...D-do not get the wrong idea, Sensei.*
> [soft]今日もよく頑張ったね。[embarrassed]か、勘違いしないでよ、先生。

**Kei3** — *Evening, Sensei. One more look at the board with me?*
> [excited]こんばんは、先生。[soft]もう一回、一緒にボード見ない？

**Kei2** — *Dinner first, rankings later. ...I mean it, Sensei.*
> [soft]先に夕飯。ランキングは後。[emphasis]本気だからね、先生。

**Kei3** — *You stayed busy today. ...I am a little proud, okay, Sensei?*
> [excited]今日も忙しくしてたね。[embarrassed]…ちょっとだけ、誇らしいんだから、先生。

**Kei4** — *Welcome home, Sensei.*
> [soft]おかえりなさい、先生。

### Night (21:00–24:00)

**Kei2** — *It is getting late, Sensei. You should rest soon.*
> [soft]もう遅いよ、先生。そろそろ休まなきゃ。

**Kei5** — *Still here at this hour? Fine, I will stay a little longer. But only because I would worry otherwise, Sensei.*
> [soft]こんな時間にまだいるの？[sighing][pause]…はぁ、わかった、もう少しだけ付き合ってあげる。[embarrassed]心配で放っておけないだけなんだからね、先生。

**Kei4** — *Late again, Sensei?*
> [soft]また夜更かし？先生。

**Kei2** — *Do not stay up too late tonight, Sensei.*
> [soft]今夜はあんまり夜更かししちゃだめだよ、先生。

**Kei4** — *One more check, then bed. Promise me, Sensei.*
> [soft]もう一回確認したら、寝るんだよ。[emphasis]約束だからね、先生。

**Kei5** — *I will keep you company a while longer. ...Only because the night is quiet, not because I want to, Sensei.*
> [soft]もう少しだけ、一緒にいてあげる。[pause][embarrassed]…夜が静かだからってだけ。べ、別にいたいわけじゃないんだからね、先生。

### Late night (00:00–05:00)

**Kei2** — *It is past midnight, Sensei. Please do not push yourself.*
> [soft]もう真夜中だよ、先生。[sad]無理しないで、お願いだから。

**Kei5** — *A night owl, are you? ...I suppose someone has to make sure you do not overdo it, Sensei.*
> [soft]夜更かしさんなんだ？[pause][sighing]…まあ、誰かが先生のやりすぎを見張ってないとね。

**Kei1** — *You are STILL awake? ...Fine, I am too. Do not read into it, Sensei.*
> [embarrassed]まだ起きてるの！？[soft]…ふん、私もだけど。[emphasis]深い意味はないんだからね、先生。

**Kei2** — *This is no hour to be working, Sensei.*
> [soft]こんな時間まで仕事するもんじゃないよ、先生。

**Kei5** — *You really should sleep. ...But fine, I will wait up with you, Sensei.*
> [soft]本当はもう寝なきゃだめなんだよ。[pause][embarrassed]…でも、いいよ。先生が起きてるなら、私も付き合ってあげる。

**Kei4** — *Caught you. ...Again, Sensei.*
> [soft]見ーつけた。[pause]…また夜更かしして、先生。

---

## General (any time)

**Kei1** — *Do you feel productive today, Sensei? ...Not that I am checking on you.*
> [embarrassed]今日ははかどってる、先生？[soft]…べ、別に見張ってるわけじゃないけど。

**Kei4** — *Good to see you, Sensei.*
> [soft]会えてうれしい…先生。

**Kei2** — *You have been doing well lately. ...I noticed, that is all, Sensei.*
> [soft]最近、調子いいね。[embarrassed]…気づいてただけだから、先生。

**Kei3** — *So, what are we conquering today, Sensei?*
> [excited]それで、今日は何を攻略するの、先生？

**Kei3** — *Ready for another run? ...I-I will help, if you insist, Sensei.*
> [excited]もう一回いく準備はいい？[embarrassed]て、手伝ってあげてもいいけど…先生がどうしてもって言うなら。

**Kei4** — *Oh, there you are, Sensei.*
> [soft]あ、先生、いたんだ。

**Kei1** — *I was not waiting for you. ...You just happened to show up, that is all, Sensei.*
> [embarrassed]べ、別に待ってなんかないから。[soft]…先生がたまたま来ただけでしょ。

**Kei5** — *Whatever you are planning, I am coming too. So do not leave me behind, Sensei.*
> [soft]先生が何を企んでても、私もついて行くから。[pause][emphasis]置いてったりしないでよね、先生。

**Kei2** — *Try not to overwork yourself today, Sensei.*
> [soft]今日は働きすぎないようにね、先生。

**Kei3** — *Let us get to it, Sensei.*
> [excited]さあ、始めよっか、先生。

---

## Day of week

### Monday — "New week"

**Kei3** — *A new week already. Do not fall behind, Sensei— I will be watching.*
> [excited]もう新しい一週間だね。[emphasis]遅れないでよ、先生。[soft]…ちゃんと見てるんだから。

**Kei2** — *Mondays are rough. ...Pace yourself, alright, Sensei?*
> [soft]月曜日はしんどいよね。[pause]無理しないで、ね、先生？

**Kei5** — *A fresh week begins. We will climb that board together— n-not that I need your help, Sensei.*
> [excited]新しい一週間の始まりだね。[soft]一緒にあのボード、登っていこう。[embarrassed]べ、別に先生の助けが必要ってわけじゃないんだからね。

**Kei3** — *Back to work already? ...I will keep you on track, Sensei.*
> [excited]もうお仕事復帰？[soft]…私がちゃんと見ててあげるから、先生。

**Kei2** — *A long week ahead. Lean on me if you must, Sensei.*
> [soft]長い一週間になりそう。[embarrassed]…どうしてもってときは、頼ってもいいよ、先生。

### Friday — "Almost the weekend"

**Kei4** — *You made it to Friday, Sensei.*
> [soft]金曜日まで来たね、先生。

**Kei3** — *The week is almost done. Finish strong, Sensei!*
> [excited]今週ももう少しで終わり。[emphasis]最後まで頑張ろう、先生！

**Kei2** — *One more push before you rest, Sensei. Do not slack now.*
> [soft]休む前にもうひと踏ん張りだよ、先生。[emphasis]ここでサボっちゃだめ。

**Kei3** — *Hang in there, Sensei. You are nearly free.*
> [excited]もう少しの辛抱だよ、先生。[soft]あと少しで自由だから。

**Kei2** — *You earned this weekend. ...Do not waste it overworking, alright, Sensei?*
> [soft]この週末は先生がちゃんと勝ち取ったものだよ。[embarrassed]…働きすぎて無駄にしちゃだめだからね、先生？

### Weekend (Saturday / Sunday)

**Kei2** — *It is the weekend. You are allowed to relax, Sensei.*
> [soft]週末だよ。少しはゆっくりしていいんだからね、先生。

**Kei5** — *Where are we heading this weekend, Sensei? ...I-I just want to know your plans, that is all.*
> [excited]今週末はどこ行くの、先生？[pause][embarrassed]べ、別に…先生の予定が知りたいだけなんだから。

**Kei1** — *The weekend already? ...G-good. Take it easy, Sensei.*
> [embarrassed]もう週末なんだ？[soft]…よ、よかった。ゆっくりしてね、先生。

**Kei1** — *No work today. ...So, did you want to spend it together, Sensei?*
> [embarrassed]今日はお仕事なし。[soft]…そ、それで、一緒に過ごしたい…とか、先生？

**Kei4** — *Rest properly this time, Sensei.*
> [soft]今度こそちゃんと休むんだよ、先生。
