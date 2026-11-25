# Тэмцээний өдрийн заавар

Сайт өөрөө Vercel дээр ажилладаг тул энэ компьютер дээр асаах ёстой зүйл хоёр л бий:

- **Piston**: Python кодыг шалгадаг Docker контейнер `coding-piston`, `localhost:2000` дээр ажиллана.
- **Cloudflare tunnel**: Vercel-ийг энэ компьютерийн Piston-той холбоно.

Tunnel унтарвал сурагчдын илгээсэн код шалгагдахгүй. Компьютер унтах, дахин асах, интернэт тасрахад tunnel унтардаг.

Бүх командыг PowerShell дээр ажиллуулна.

## 1. Эхлэхээс 1 цагийн өмнө

**Компьютерийг цахилгаанд залгана.** Цахилгаанд залгаатай үед унтахгүй тохиргоотой (Sleep: Never). Батарейгаар 10 минутын дараа унтдаг. Хэрэв зөөврийн компьютер бол тагийг нь хаахгүй.

**Docker Desktop-ийг асаана.** Асаалттай бол энэ алхмыг алгасна.

```powershell
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
```

Docker бэлэн болохыг хүлээнэ. Доорх команд `coding-piston Up ...` гэж гаргавал бэлэн. Docker асахад контейнер өөрөө асна.

```powershell
docker ps --filter name=coding-piston --format "{{.Names}} {{.Status}}"
```

**Төслийн хавтас руу орно.**

```powershell
cd "D:\2026-2027 lessons\shine ue coding"
```

**Vercel-д нэвтэрсэн эсэхээ шалгана.** Нэрээ харуулбал болно. Алдаа гарвал `vercel.cmd login` ажиллуулаад хөтөч дээр нэвтэрнэ.

```powershell
vercel.cmd whoami
```

**Tunnel асааж, Vercel-д шинэ хаягийг өгнө.** 2–4 минут болно. Хуучин tunnel-ийг зогсоож, шинийг асааж, Vercel-ийн `PISTON_URL`-ийг шинэчлээд production-ийг дахин build хийнэ. «Дууслаа» гэж гарах хүртэл хүлээнэ.

```powershell
npm.cmd run script -- scripts/piston-tunnel.ts
```

## 2. Шалгах

**Tunnel ажиллаж байгаа эсэх.** `5` гэж хэвлэвэл зөв.

```powershell
$u = (Select-String -Path data\cloudflared.log -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' | Select-Object -Last 1).Matches.Value; $u; (Invoke-RestMethod -Method Post "$u/api/v2/execute" -ContentType 'application/json' -Body '{"language":"python","version":"*","files":[{"content":"print(2+3)"}]}').run.stdout
```

**Сайтаас шалгах.** Сайтад нэвтэрч, модулийн аль нэг Python бодлогыг илгээнэ. Оноо гарвал бүх зүйл ажиллаж байна.

**Тэмцээний тохиргоо.** Багшийн самбарт нэр, огноо, цаг, бодлогууд зөв эсэхийг харна. «Нийтэд харуулах» тэмдэглэгээтэй байх ёстой. Нэг жил үргэлжлэх `python-contest-2026`-г нийтэд нээхгүй.

## 3. Эхлэхээс 10–15 минутын өмнө

- Сурагчдыг одоо нэвтрүүлнэ. Нэвтрэлт олноороо давхцахаар удаашралтай байдаг. Эхлэх мөчид бүгд зэрэг нэвтрэх гэж оролдохгүй байх нь дээр.
- Заалны том дэлгэц дээр leaderboard-ийг нээгээд F11 дарж бүтэн дэлгэцээр харуулна. Нэвтрэх шаардлагагүй, хуудас 15 секунд тутам өөрөө шинэчлэгдэнэ.

```powershell
Start-Process "https://coding-ibdp-cs.vercel.app/live/shine-ue-contest-2026-11-28"
```

## 4. Тэмцээний үеэр

- Компьютерийг унтрааж, унтуулж, Docker-ийг хааж болохгүй.
- `piston-tunnel.ts`-ийг шаардлагагүй бол дахин бүү ажиллуул. Хаяг солигдоод, шинэ build бэлэн болох хүртэл 1–3 минут код шалгагдахгүй.
- **Сурагчдын код шалгагдахгүй болбол:**
  1. Дээрх «Tunnel ажиллаж байгаа эсэх» командыг ажиллуулна.
  2. `5` гарахгүй бол `npm.cmd run script -- scripts/piston-tunnel.ts`-ийг дахин ажиллуулна.
  3. «Not authorized» эсвэл «token is not valid» гэж гарвал эхлээд `vercel.cmd login` хийнэ.

## 5. Дууссаны дараа

Tunnel-ийг зогсоож болно. Энэ команд зөвхөн Piston-ий tunnel-ийг зогсооно, бусад төслийн tunnel-д хүрэхгүй.

```powershell
Get-CimInstance Win32_Process -Filter "name='cloudflared.exe'" | Where-Object { $_.CommandLine -like '*--url http://localhost:2000*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
```

Зогсоосны дараа сайт дээрх Python бодлогууд шалгагдахгүй. Дараа нь хэрэг болоход 1-р хэсгийн tunnel командыг дахин ажиллуулна.
