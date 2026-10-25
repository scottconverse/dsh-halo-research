---
name: textflowkit
description: Transcribe meeting recordings or media URLs to timestamped text and subtitles with the existing local TextFlowKit installation; export transcripts to document formats.
---
# TextFlowKit on Halo
Use the existing pwsh tool and installed TextFlowKit 0.1.19. No model/provider changes or additional transcription installation.

    & 'C:/Users/scott/AppData/Local/Programs/TextFlowKit/runtime/python.exe' '<skill-resource-base>/scripts/textflowkit_cli.py' transcribe 'C:/path/meeting.mp4' --formats json,srt,txt --output-dir 'C:/path/transcripts'

The small runner calls the installed native CLI after applying its own Windows runtime environment. Default Whistle uses CPU and existing weights. Do not switch to Whisper, install torch, change GPU settings or download models unless requested. URL downloads require normal source access. Use --help for transcribe, batch or export arguments; use export to re-render saved transcript JSON. Do not run selftest or benchmarks during ordinary use. Keep transcript timestamps/source attribution. Inspect the produced transcript; transcription is not factual verification. Use the LibreOffice skill to turn reviewed material into a formatted report.
