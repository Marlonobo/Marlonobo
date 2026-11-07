# TOUCH LIVE – MP4 direkt aus deinen Dateien hochladen

**Bestehende Seite:** https://touch-live-unterricht-2026.onrender.com/#admin

Dein Film (ca. 3,03 GB) wird im Browser in 16-MiB-Blöcken direkt in einen Cloudflare-R2-Bucket hochgeladen. Das Render-Webprojekt verarbeitet nur die Steuerdaten; es empfängt **nicht die 3,03 GB**. Die Video-URL wird nach dem fertigen Upload automatisch in TOUCH LIVE hinterlegt.

**Wichtig:** Solange bei https://touch-live-unterricht-2026.onrender.com/api/storage/status `"configured":false` steht, kannst du deine MP4 auswählen, aber **nicht hochladen**. Du musst zuerst R2 aktivieren und die Zugangsdaten auf Render hinterlegen. Der Assistent kann diese Zugangsdaten nicht selbst erzeugen, ohne Zugriff auf dein Cloudflare-Konto. Gib Zugangsdaten nicht im Chat und nicht auf GitHub weiter.

## Einmalige Einrichtung – Cloudflare R2 (Standard)

1. Öffne https://dash.cloudflare.com/ → **R2 object storage** → **Create bucket**. Name z. B. `touch-live-doku`. Wähle **Standard** (nicht Infrequent Access).
2. Unter **R2 → Manage API tokens** einen *Account API token* oder *User API token* mit **Object Read & Write** und Zugriff **nur auf den Bucket** `touch-live-doku` erstellen.
3. Merke dir den **S3 API Endpoint**, die **Access Key ID** und den **Secret Access Key**. Diese 3 Werte niemals in GitHub eintragen!
4. Öffne https://dashboard.render.com/web/srv-dbn0f7ei0phs73d16p20 → **Environment** und trage ein:

   ```text
   S3_ENDPOINT=https://DEINE_ACCOUNT_ID.r2.cloudflarestorage.com
   S3_BUCKET=touch-live-doku
   S3_REGION=auto
   S3_ACCESS_KEY_ID=<aus Cloudflare R2>
   S3_SECRET_ACCESS_KEY=<aus Cloudflare R2>
   S3_PREFIX=touch-live
   ```

   Nach dem Speichern wird der Render-Dienst neu gestartet. Die vorhandene Webadresse bleibt dieselbe.

5. Öffne in Cloudflare **R2 → dein Bucket → Settings → CORS policy** und füge diese Regel ein:

   ```json
   [
     {
       "AllowedOrigins": ["https://touch-live-unterricht-2026.onrender.com"],
       "AllowedMethods": ["GET", "PUT", "HEAD"],
       "AllowedHeaders": ["*"],
       "ExposeHeaders": ["ETag", "Content-Length", "Content-Range"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```

   Wichtig: **ETag** muss bei den PUT-Antworten lesbar sein, sonst kann TOUCH LIVE keine Blöcke bestätigen. Die Origin darf keinen abschließenden Schrägstrich haben. Ein Fehler kann noch kurz nach dem Speichern auftreten, während CORS verteilt wird.

6. Prüfe https://touch-live-unterricht-2026.onrender.com/api/storage/status. Dort muss `configured:true` stehen. Anschließend die Adminseite neu öffnen.

## Video direkt von deinem PC hochladen

1. Öffne die Adminseite und suche **„VIDEO HOCHLADEN · AUS DEINEN DATEIEN“**.
2. Auf **„MP4-Datei auswählen“** klicken und deine ca. 3,03-GB-Datei auswählen.
3. Auf **„MP4 hochladen“** klicken. Das Fortschrittsfeld zeigt die bereits bestätigten Blöcke. Lass diesen Browser-Tab geöffnet.
4. Bricht die Verbindung ab, dieselbe Datei erneut auswählen und erneut auf „MP4 hochladen“ klicken. Das System fragt bereits gespeicherte Blöcke bei R2 ab und setzt fort.
5. Erst nach der Meldung **„Upload fertig“** kann dein Film remote abgespielt werden.

**Zwei Städte mit HDMI:** Wenn im Admin vorher **„Lokale MP4 / HDMI“** aktiviert wurde, wird die hochgeladene Filmkopie *nur für /watch* gespeichert. Die Wiedergabe auf deinem HDMI-PC bleibt lokal. Falls kein lokaler HDMI-Modus aktiv ist, wird die hochgeladene MP4 die gemeinsame Online-Filmquelle für alle Geräte. Die Quiz-Timer und das Zoom-Spiel bleiben mit der Server-Filmzeit synchronisiert.

**Zusammen schauen:** https://touch-live-unterricht-2026.onrender.com/watch – beide mit Vornamen anmelden. Auf einem Gerät beim Filmstart einmal den Ton freigeben, danach wird zur Quizfrage gescrollt und anschließend zurück zum Film. Alternativ auf Gerät 2 nur das Quiz über https://touch-live-unterricht-2026.onrender.com/join öffnen.

## Kosten und Grenzen

Cloudflare R2 **Standard** hat monatlich 10 GB-Monate Speicher, 1 Million Class-A-Aufrufe und 10 Millionen Class-B-Aufrufe im kostenlosen Kontingent; ausgehender Datentransfer aus R2 ist kostenlos. Ein einmal gespeicherter 3,03-GB-Film liegt innerhalb der Freimenge. **Cloudflare kann ein Abrechnungsprofil verlangen und die Überschreitung des kostenlosen Kontingents kann Kosten verursachen.**

- Keine MP4-Datei im Repo, keine S3-Geheimnisse im Browser und kein Upload per Render-Request.
- Die Datei ist über die bestehende TOUCH-LIVE-Webseite für Besucher mit Link abrufbar. **Es ist kein persönlicher DRM- oder Zugangsschutz** für die Filmdatei.
- Für die richtige Synchronisierung muss der Film die Zeitmarken der Doku beibehalten. Falls der exportierte Film einen anderen Schnitt oder eine andere Länge hat, die Quiz-Marker im Adminbereich anpassen.
- Die Datei sollte MP4 (H.264/AAC) sein, für breite Wiedergabe auf Safari, Chrome und LG-TV.
- Ohne echte R2-Zugangsdaten und die 3,03-GB-Datei kann die reale Übertragung noch nicht vollständig getestet werden.
- Auf kostenlosen Render-Instanzen können Sitzungsdaten bei Neustarts verloren gehen. Für dauerhaft gespeicherte Teilnehmerdaten wäre eine eigene Datenbank nötig.

### Technische Details

- Einmaliger multipart-Upload in 16-MiB-Teilen mit 3 gleichzeitigen Verbindungen und automatischen Wiederholungen.
- Signierte Upload-URLs vom Render-Server; Passwort und API-Schlüssel bleiben dort.
- Datei in R2 als `touch-live/master-video.mp4`, Stream-URL für die Besucher: `/api/storage/video`.
- Wiedergabe per HTTPS mit Range-Anfragen, soweit der Browser und R2 dies unterstützen.
- CORS-Origin: `https://touch-live-unterricht-2026.onrender.com`.
