"""Naskah narasi, satu sumber untuk semua mesin suara.
Tiap potongan: (yang diucapkan, yang tampil di subtitle).
"""

SCENES = [
    [
        ("Di ujung selatan Batam, terbentang rangkaian jembatan", "Di ujung selatan Batam, terbentang rangkaian jembatan"),
        ("yang kini menjadi wajah kota ini.", "yang kini menjadi wajah kota ini."),
        ("Tapi tahukah kamu, dari mana nama Barelang berasal?", "Tapi tahukah kamu, dari mana nama Barelang berasal?"),
    ],
    [
        ("Barelang adalah singkatan dari tiga pulau besar:", "Barelang adalah singkatan dari tiga pulau besar:"),
        ("Batam, Rempang, dan Galang.", "Batam, Rempang, dan Galang."),
        ("Ketiganya dihubungkan oleh enam jembatan,", "Ketiganya dihubungkan oleh enam jembatan,"),
        ("melewati beberapa pulau kecil di antaranya.", "melewati beberapa pulau kecil di antaranya."),
    ],
    [
        ("Proyek ini digagas oleh Be Je Habibie saat menjabat Ketua Otorita Batam.", "Proyek ini digagas oleh B.J. Habibie saat menjabat Ketua Otorita Batam."),
        ("Tujuannya: memperluas wilayah pengembangan Batam", "Tujuannya: memperluas wilayah pengembangan Batam"),
        ("ke pulau-pulau di sekitarnya.", "ke pulau-pulau di sekitarnya."),
        ("Karena itu, banyak warga juga menyebutnya Jembatan Habibie.", "Karena itu, banyak warga juga menyebutnya Jembatan Habibie."),
    ],
    [
        ("Pembangunannya dimulai tahun sembilan belas sembilan puluh dua", "Pembangunannya dimulai tahun 1992"),
        ("dan rampung tahun sembilan belas sembilan puluh delapan.", "dan rampung tahun 1998."),
        ("Enam tahun, enam jembatan,", "Enam tahun, enam jembatan,"),
        ("dengan biaya sekitar empat ratus miliar rupiah,", "dengan biaya sekitar 400 miliar rupiah,"),
        ("melibatkan ratusan insinyur dalam negeri.", "melibatkan ratusan insinyur dalam negeri."),
    ],
    [
        ("Keenam jembatan ini diberi nama tokoh-tokoh bersejarah Melayu Riau:", "Keenam jembatan ini diberi nama tokoh-tokoh bersejarah Melayu Riau:"),
        ("Tengku Fisabilillah, Nara Singa, Raja Ali Haji,", "Tengku Fisabilillah, Nara Singa, Raja Ali Haji,"),
        ("Sultan Zainal Abidin, Tuanku Tambusai, dan Raja Kecik.", "Sultan Zainal Abidin, Tuanku Tambusai, dan Raja Kecik."),
        ("Yang paling terkenal adalah Jembatan Satu, Tengku Fisabilillah:", "Yang paling terkenal adalah Jembatan Satu, Tengku Fisabilillah:"),
        ("jembatan kabel sepanjang enam ratus empat puluh dua meter.", "jembatan kabel sepanjang 642 meter."),
    ],
    [
        ("Sejak rampung, Barelang bukan lagi sekadar jalur penghubung.", "Sejak rampung, Barelang bukan lagi sekadar jalur penghubung."),
        ("Ia menjadi tempat warga dan wisatawan menikmati senja,", "Ia menjadi tempat warga dan wisatawan menikmati senja,"),
        ("dan menjadi ikon yang paling diingat dari Batam.", "dan menjadi ikon yang paling diingat dari Batam."),
    ],
    [
        ("Barelang: menghubungkan pulau, menyatukan cerita.", "Barelang: menghubungkan pulau, menyatukan cerita."),
        ("Datang dan saksikan sendiri keindahannya di Batam.", "Datang dan saksikan sendiri keindahannya di Batam."),
    ],
]

# Tag ekspresi hanya untuk eleven_v3: tidak diucapkan, hanya mengarahkan intonasi.
V3_TAGS = ["[warmly]", "[thoughtful]", "[calm]", "[proudly]", "[storytelling]", "[softly]", "[warmly]"]
