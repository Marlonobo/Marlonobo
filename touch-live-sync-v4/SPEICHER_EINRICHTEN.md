# TOUCH LIVE – einmaliger Upload für alle Geräte

Die neue TOUCH-LIVE-Version ist online. **Damit ein 3,03-GB-Film dauerhaft nur ein einziges Mal hochgeladen werden muss**, muss der Betreiber einen S3-kompatiblen Objektspeicher verbinden. Der bisherige Render-Webserver besitzt ohne zusätzliche Konfiguration **keinen dauerhaften Videospeicher**.

## Einmalige Einrichtung (Beispiel: Cloudflare R2)

1. R2-Bucket erstellen (z. B. `touch-live-doku`).
2. Nur für diesen Bucket einen S3-Zugang mit Objekt-Lese- und Schreibrechten erzeugen.
3. In [Render – TOUCH LIVE](https://dashboard.render.com/web/srv-dbn0f7ei0phs73d16p20), unter **Environment**, diese Variablen hinterlegen (Werte niemals ins öffentliche GitHub-Repository schreiben):

```
S3_ENDPOINT=https://DEINE_ACCOUNT_ID.r2.cloudflarestorage.com
S3_BUCKET=touch-live-doku
S3_REGION=auto
S3_ACCESS_KEY_ID=...aus dem R2-Dashboard...
S3_SECRET_ACCESS_KEY=...aus dem R2-Dashboard...
S3_PREFIX=touch-live
```

4. Für Uploads direkt aus dem Browser die folgende **CORS-Konfiguration** in den R2-Bucket einfügen:

```json
[
  {
    "AllowedOrigins": [
      "https://touch-live-unterricht-2026.onrender.com"
    ],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

5. Nach dem Render-Neustart prüfen: `https://touch-live-unterricht-2026.onrender.com/api/storage/status` muss `"configured":true` melden.
6. Im Admin-Bereich einmalig MP4 wählen und „Einmalig hochladen“ klicken. Der Browser überträgt 16-MB-Blöcke mit mehreren parallelen Verbindungen. Bei Abbruch dieselbe Datei erneut auswählen und fortsetzen. Das ursprüngliche Browserfenster und der lokale Browser-Speicher dürfen für eine Fortsetzung nicht gelöscht werden.
7. Nach dem vollständigen Upload wechselt die gemeinsame Quelle zu `/api/storage/video`. Alle Geräte erhalten diese zentrale Datei über einen zeitlich begrenzten, signierten Link; keine erneuten Uploads auf iPad, Fernseher oder bei der Moderatorin erforderlich.
8. Die .vtt- oder .srt-Untertitel im Adminbereich hochladen; sie werden ebenfalls im Bucket gespeichert. Auf Beamer, Zuschauerbildschirm und Moderatorinnenansicht erscheinen die Untertitel weiß mit Kontur ohne schwarzen Balken. Größe und Position sind im Adminbereich einstellbar.

## Für andere S3-kompatible Anbieter

Entsprechend S3_ENDPOINT, S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY und die Browser-CORS-Freigabe hinterlegen. Der vorhandene Adapter benötigt keine zusätzlichen npm-Pakete.

## iPad im Vollbild

Nach Eingabe des Namens versucht TOUCH LIVE sofort, in den Vollbildmodus zu wechseln. Wenn Safari den Vorgang nicht erlaubt, „⛶ Vollbild öffnen“ auf der Schülerseite drücken. Für einen dauerhaft rahmenlosen Start die Webseite in Safari über „Teilen“ → „Zum Home-Bildschirm“ hinzufügen und dann über dieses Symbol starten. Apples Fullscreen-Einschränkungen sind browser-/geräteabhängig.

## Wichtige Grenzen

- Die S3-Verbindung ist derzeit **noch nicht konfiguriert**; Code allein kann kein Cloud-Konto oder Zugangsdaten ersetzen.
- Der Upload einer echten 3,03-GB-Datei wurde mangels bereitgestellter Datei und Cloud-Zugang nicht als End-to-End-Test durchgeführt.
- Für echte dauerhafte Teilnehmer-Ergebnisse und Live-Daten ist zusätzlich eine Datenbank empfehlenswert; das aktuelle Live-Backend verwaltet einen Teil der Daten auf dem Render-Server.
- Videowiedergabe bleibt von stabiler Internetverbindung, Videoformat, Smart-TV-Browser und Autoplay-Beschränkungen abhängig.
