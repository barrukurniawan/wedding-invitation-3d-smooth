// Replace these values with your wedding information. All text is rendered safely.
// Atlas rows follow the eight named directions; column 0 is idle and 1–9 are walking.
window.WEDDING = {
  demo: true,
  characters: {
    men: {atlas: 'assets/character-atlas.png', frames: 9},
    woman: {atlas: 'assets/woman-atlas.png', frames: 7}
  },
  places: [
    {id:'ceremony',title:'Akad & Resepsi',subtitle:'Jadwal hari bahagia kami',symbol:'♡',x:.50,y:.27,description:'',fields:[],events:[
      {title:'Akad Nikah',date:'Minggu, 4 Oktober 2026',time:'08.00–12.00 WIB',venue:'Hotel Borobudur Jakarta',address:'Jl. Lapangan Banteng Selatan No. 1, Jakarta Pusat'},
      {title:'Resepsi',date:'Minggu, 4 Oktober 2026',time:'13.00–16.00 WIB',venue:'Hotel Borobudur Jakarta',address:'Jl. Lapangan Banteng Selatan No. 1, Jakarta Pusat'}
    ]},
    {id:'gifts',title:'Hadiah',subtitle:'Tanda kasih untuk mempelai',symbol:'♡',x:.78,y:.35,description:'Kehadiran dan doa kamu adalah hadiah terindah. Berikut contoh rekening dan alamat hadiah. Data ini hanya untuk demo; jangan melakukan transfer atau mengirim hadiah ke alamat ini.',fields:[],sections:[
      {title:'Rekening Faris',fields:[['Bank','BCA (contoh)'],['Nomor rekening','0000000000 (dummy)'],['Atas nama','Faris (contoh)']]},
      {title:'Rekening Eliza',fields:[['Bank','Mandiri (contoh)'],['Nomor rekening','0000000000000 (dummy)'],['Atas nama','Eliza (contoh)']]},
      {title:'Pengiriman hadiah',fields:[['Penerima','Faris & Eliza (contoh)'],['Alamat pengiriman','Jl. Taman Bahagia No. 12, Kebayoran Baru, Jakarta Selatan 12120 (alamat fiktif)']]}
    ]},
    {id:'wishes',title:'Ucapan Bahagia',subtitle:'Sepucuk doa dari orang tersayang',symbol:'✉',x:.23,y:.32,description:'Titipkan doa dan harapan manismu untuk Faris & Eliza. Semua tamu bisa membaca ucapan di sini.',fields:[]},
    {id:'story',title:'Cerita kami',subtitle:'Perjalanan menuju selamanya',symbol:'♥',x:.25,y:.67,description:'Berawal dari pertemuan sederhana melalui teman, obrolan kami tumbuh menjadi rasa nyaman. Kini, kami siap memulai babak baru bersama. Kisah berikut adalah cerita contoh.',fields:[['Pertemuan pertama','Juni 2022 — berkenalan di acara seorang teman'],['Menjalin hubungan','Januari 2023 — memutuskan melangkah bersama'],['Lamaran','Mei 2026 — mempertemukan dua keluarga'],['Hari bahagia','4 Oktober 2026 — mengikat janji pernikahan']]},
    {id:'gallery',title:'Galeri Foto',subtitle:'Momen indah dalam bingkai',symbol:'▧',x:.77,y:.69,description:'Koleksi foto pernikahan pilihan sebagai contoh galeri Faris & Eliza. Foto bersumber dari Unsplash.',fields:[],photos:[
      {src:'assets/gallery-1.jpg',alt:'Pasangan pengantin di jalan setapak yang dikelilingi pepohonan',credit:'Jennifer Kalenberg',url:'https://unsplash.com/photos/To1y6aSGiw0'},
      {src:'assets/gallery-2.jpg',alt:'Pasangan pengantin merayakan hari pernikahan bersama',credit:'Dallas Rogers',url:'https://unsplash.com/photos/thkwDqb94hE'},
      {src:'assets/gallery-3.jpg',alt:'Buket bunga untuk pernikahan',credit:'Meg Jenson',url:'https://unsplash.com/photos/jlUBvJbFo0g'}
    ]},
    {id:'welcome',title:'Selamat datang',subtitle:'Senang sekali kamu hadir',symbol:'✉',x:.50,y:.79,description:'Selamat datang di dunia kecil pernikahan kami. Nikmati suasananya, jelajahi taman, dan temukan rencana hari bahagia kami. Kami tak sabar merayakannya bersamamu.',fields:[['Undanganmu','Pernikahan Faris & Eliza'],['Hari bahagia','Minggu, 4 Oktober 2026'],['Lokasi','Hotel Borobudur Jakarta'],['Jelajahi taman','Ada enam tempat untuk dikunjungi']]}
  ]
};
