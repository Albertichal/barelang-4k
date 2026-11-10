# Asal Usul Barelang: catatan produksi

## Cek fakta (dicek 9 November 2026)

| Klaim | Status | Yang dipakai di video |
|---|---|---|
| Barelang = Batam, Rempang, Galang; 6 jembatan | Cocok | Sesuai naskah |
| Digagas B.J. Habibie saat Ketua Otorita Batam | Cocok | Sesuai naskah |
| Dibangun 1992–1998 | Cocok (Wikipedia: Juli 1992 – Januari 1998) | Sesuai naskah |
| Biaya ±Rp400 miliar | Mayoritas sumber; JPNN (2011) menulis Rp88,1 miliar | "sekitar 400 miliar" |
| Nama, pulau, panjang 6 jembatan | Cocok | Sesuai naskah |
| "Dikerjakan insinyur dalam negeri" | Sebagian: beberapa sumber "ratusan insinyur Indonesia, tanpa tenaga asing"; JPNN menyebut ahli luar dan dalam negeri (ITB) di Jembatan 1; Wikipedia menyebut konsep desain dari Bruce Ramsay (VSL) | **Diubah**: "melibatkan ratusan insinyur dalam negeri" |
| "Tokoh abad ke-15 hingga ke-18" | Kurang tepat: Raja Ali Haji hidup sekitar 1808–1873 (abad ke-19) | **Dihapus**: "tokoh-tokoh bersejarah Melayu Riau" |
| Tinggi pylon Jembatan 1 | Sumber berbeda (118 m / 199 m) | Tidak disebut di narasi dan teks |

Raja Kecik (Jembatan 6): tipe strukturnya tidak ditemukan, jadi kartunya menulis "Jembatan terpendek" dan modelnya distilisasi.

Sumber:
- https://id.wikipedia.org/wiki/Jembatan_Barelang
- https://en.wikipedia.org/wiki/Barelang_Bridge
- https://www.goodnewsfromindonesia.id/2025/08/21/jembatan-barelang-mahakarya-bj-habibie-yang-kini-jadi-ikon-batam
- https://kumparan.com/kumparantravel/asal-usul-penamaan-jembatan-barelang-yang-jadi-ikon-kota-batam-1qxhR0om85u
- https://www.jpnn.com/news/jembatan-barelang-sanggup-bertahan-100-tahun
- https://www.indonesia.travel/in/en/destinations/sumatra/batam/barelang-bridge-architectural-icon-of-batam
- https://en.wikipedia.org/wiki/Raja_Ali_Haji

## Storyboard final

Durasi tiap scene = terpanjang antara storyboard dan narasi + jeda (`src/timing.config.json`). Total sekitar 108 detik, lebih panjang dari target 95 detik karena narasi edge-tts lebih panjang dari perkiraan.

1. Pembuka: terbang rendah di laut pagi, BARELANG naik dari air.
2. Arti nama: peta, BA-RE-LANG terbang dan menyatu.
3. Penggagas: blueprint + kacamata abstrak (tanpa wajah), lalu gelombang wilayah Otorita Batam.
4. Pembangunan: Jembatan 1 dibangun dari pylon ke dua arah, timeline 3D, penghitung angka.
5. Enam jembatan: fly-through utara ke selatan dengan kartu info. Jendela tiap jembatan sama panjang, jadi nama pada narasi tidak tepat sinkron dengan kartu.
6. Klimaks senja: Jembatan 1, kamera dari bawah dek ke atas pylon, lampu menyala bertahap.
7. Penutup: malam, garis cahaya sepanjang rangkaian, kredit.

## Keputusan teknis

- Tata letak pulau distilisasi: urutan benar, jarak dan bentuk bukan peta sebenarnya.
- `Text3D` (drei) diganti `TextGeometry` sinkron: Suspense membuat R3F menggambar frame kosong saat render.
- `@react-three/postprocessing` dibuang: `EffectComposer` menghasilkan kanvas kosong saat render Remotion (dengan maupun tanpa multisampling). Sebagai gantinya: ACES tone mapping, fog, dan halo aditif untuk lampu. Bloom layar penuh dan depth of field tidak ada.
- Whoosh antar scene memakai aset `@remotion/sfx` yang diunduh ke `public/sfx/`. Motion-trail palsu tidak dibuat.
- `dpr` = min(1, devicePixelRatio): tetap 1 pada render 4K; pada preview `--scale=0.5` buffer ikut 1080p supaya cepat.
- Premount dimatikan supaya tidak ada dua kanvas 4K yang dimuat tanpa perlu.
- Audio dirender utuh terpisah lalu di-mux, bukan per scene, untuk menghindari celah AAC di sambungan concat.
- `getAudioDurationInSeconds` sudah ditandai deprecated oleh Remotion, tetap dipakai sesuai brief dan masih berfungsi.

## Revisi 1 (9 November 2026)

Catatan ini menggantikan bagian lama yang bertentangan (font Montserrat, whoosh dari `@remotion/sfx`).

| Poin | Perubahan | Bukti di `out/check/` |
|---|---|---|
| 1 Font | Semua font dari `src/theme/fonts.ts`. Default A (Playfair Display + Inter). Ganti opsi: ubah `ACTIVE`. Subtitle 52 px dengan kotak gelap tipis. | `font_options.png` |
| 2 Pohon | Pohon hutan (batang + kanopi bergumpal), kelapa di pantai, semak. Ketinggian diambil dari permukaan mesh pulau (interpolasi segitiga yang sama), batang ditanam 0,4 unit, lereng curam ditolak. | `p2_pohon_closeup_pantai.png`, `p2_pohon_closeup_lereng.png` |
| 3 Blueprint | Kacamata dihapus. Meja gambar, garis menggambar peta 6 jembatan dengan pensil, penggaris, dan jangka. | `p3_blueprint.png` |
| 4 Peta rencana | Komponen `BarelangWorld` dipakai semua scene. Scene 3 memakai garis putus-putus "Rencana jembatan" berurutan; di scene 4 garisnya padam saat dek terbangun. Jalan tipis berkelok mengikuti kontur. Lingkaran putih diganti gelombang cahaya di shader laut. | `p4_peta_rencana.png`, `p4_rencana_jadi_jembatan.png` |
| 5 Pulau HD | Mesh dua LOD, smooth normal, fbm + domain warp, warna tinggi/kemiringan, noise detail, AO palsu di lembah, MSAA. | `p5_sebelum_scene4.png`, `p5_sesudah_scene4.png`, `p5_scene5_lod.png`, `p5_4k_asli.png` |
| 6 Dek | `bridge1Config` jadi satu sumber ukuran. Penyebab celah: dua segmen tengah tidak pernah tampil pada progress 100%. Ditambah pagar, marka, lampu. | `p6_dek_tengah_atas.png` |
| 7 Kabel | Anchor A dan B dihitung dari `bridge1Config`, 2 bidang kabel, semi-fan, pylon portal dengan kepala. | `p7_anchor_pylon.png`, `p7_anchor_dek.png`, `p7_tengah_bentang.png`, `p7_jauh.png` |
| 8 Suara | `scripts/generate_voice.py` (ElevenLabs + rekaman sendiri), SFX di `public/sfx/`, sumber di `CREDITS.md`. | Level terukur: SFX sekitar 19 dB di bawah narasi |
| 9 Laut | Peta jarak pantai `public/shore.png` untuk gradasi kedalaman dan busa, normal berlapis, kilau matahari per scene, bayangan awan. | `p9_laut_pagi.png`, `p9_laut_siang.png`, `p9_laut_senja.png`, `p9_laut_malam.png` |

Status poin 8:
- ElevenLabs: skrip selesai tetapi **belum pernah dijalankan** karena `ELEVENLABS_API_KEY` belum ada. Sampel `voice_*.mp3` belum ada. Kredit di akhir video muncul otomatis begitu ada scene memakai ElevenLabs.
- OmniVoice: **tidak dicoba**. Model 3,27 GB ditambah PyTorch sekitar 1 GB, sedangkan disk tersisa 6,7 GB (render 4K juga butuh ruang) dan RAM bebas sekitar 2,4 GB. Metadata model di Hugging Face juga tidak mencantumkan lisensi.
- Rekaman sendiri: rantai ffmpeg sudah diuji dengan audio sintetis.
- Narasi saat ini masih edge-tts, sebagai pengisi sementara.
- SFX `whoosh.mp3` dan `metal.mp3` dibuat sendiri dengan ffmpeg: tidak ada dentang CC0 yang cocok di Wikimedia Commons, dan lisensi whoosh dari `@remotion/sfx` tidak jelas. Freesound butuh API key dan Pixabay memblokir akses otomatis.

Catatan teknis:
- Bentuk pulau berubah? Jalankan ulang bake di `scripts/bake-shore.ts` (perintah ada di baris atas file itu).
- Still bukti: `python scripts/check.py`. Komposisi `Debug` hanya untuk kamera bukti, tidak ikut video.
- Render preview terbaru belum dijalankan, sesuai permintaan.
