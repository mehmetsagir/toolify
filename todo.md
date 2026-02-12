# Toolify - TODO

## Textream'den Alinacak Fikirler

- [x] `SFSpeechRecognizer` entegrasyonu - Apple'in on-device, offline STT motoru (3. provider olarak)
- [x] Dual fuzzy matching pattern - real-time partial results ile canli transkripsiyon gosterimi
- [x] `audioEngine.reset()` pattern - her oturumda ses cihazini zorla yeniden alma teknigi

---

## Voice Triggered Actions

**Durum:** Planlanıyor

"Hey Toolify" veya özel bir ses komutuyla kayıt başlatma/durdurma. Ellerin dolu olduğunda hands-free kullanım.

- [ ] Wake word detection mekanizması seç (örn: Porcupine, Snowboy veya Apple Speech Recognition)
- [ ] Sürekli düşük güçte mikrofon dinleme (background listening)
- [ ] Özel wake word tanımlama desteği
- [ ] Ses komutu sonrası kayıt başlat/durdur aksiyonları
- [ ] Pil/CPU kullanımı optimizasyonu (sürekli dinleme modunda)
- [ ] Settings UI: wake word açma/kapama, özel kelime ayarı
- [ ] Mikrofon izni akışını güncelle (sürekli erişim gerekli)

---

## Clipboard Queue (Çoklu Pano)

**Durum:** Planlanıyor

Son 10 transcription'ı bir pano kuyruğunda tutma. `Cmd+Shift+V` ile listeden seçip yapıştırma.

- [ ] Clipboard queue veri yapısı (max 10 item, FIFO)
- [ ] Her transcription sonrası queue'ya otomatik ekleme
- [ ] Global shortcut (`Cmd+Shift+V`) ile floating picker penceresi
- [ ] Picker UI: liste görünümü, önizleme, tıkla-yapıştır
- [ ] Seçilen item'ı clipboard'a kopyala ve aktif uygulamaya yapıştır
- [ ] Queue'yu temizleme ve tek item silme
- [ ] Settings UI: özelliği açma/kapama, shortcut özelleştirme, max item sayısı
- [ ] Uygulama kapandığında queue persist etme (opsiyonel)

---

## Screen OCR + Voice

**Durum:** Planlanıyor

Ekrandaki seçili alanı OCR ile okuyup, üstüne sesli not ekleme. Screenshot + transcription birleşik workflow.

- [ ] Ekran bölgesi seçim aracı (crosshair selection, macOS screenshot tarzı)
- [ ] Seçilen alanın screenshot'ını alma
- [ ] macOS Vision framework veya Tesseract ile OCR işleme
- [ ] OCR sonrası otomatik ses kaydı başlatma (sesli not ekleme)
- [ ] OCR metin + sesli not birleştirme ve sonucu clipboard'a kopyalama
- [ ] History'de OCR+Voice kayıtlarını ayrı tip olarak saklama (thumbnail ile)
- [ ] Global shortcut ataması (örn: `Cmd+Shift+O`)
- [ ] Settings UI: OCR dil seçimi, çıktı formatı ayarları

---

## Whisper Prompt Context

**Durum:** Planlanıyor

Uygulamaya özel bağlam verme — "Bu bir tıbbi kayıt", "Bu bir yazılım toplantısı" gibi. Whisper'ın `initial_prompt` parametresiyle domain-specific doğruluk artışı.

- [ ] Ön tanımlı context profilleri oluştur (Tıbbi, Yazılım, Hukuk, Günlük, Toplantı)
- [ ] Her profil için `initial_prompt` metni tanımla
- [ ] Kullanıcının özel profil oluşturabilmesi (isim + prompt metni)
- [ ] OpenAI Whisper API çağrısına `prompt` parametresi ekle
- [ ] Local Whisper (whisper.cpp) çağrısına `--prompt` flag'i ekle
- [ ] Aktif context profili seçimi (tray menü veya settings)
- [ ] Hızlı geçiş: tray menüden veya shortcut ile profil değiştirme
- [ ] Settings UI: profil listesi, ekleme/düzenleme/silme
- [ ] Varsayılan profil ayarı
