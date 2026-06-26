const fs = require('fs');
const path = require('path');

const translations = {
  '>Logbooks<': '>Buku Log<',
  '"Logbooks"': '"Buku Log"',
  '>New Logbook<': '>Buku Log Baru<',
  '>Create Logbook<': '>Buat Buku Log<',
  '>Edit Logbook<': '>Edit Buku Log<',
  '>Delete Logbook<': '>Hapus Buku Log<',
  '>Add Activity<': '>Tambah Aktivitas<',
  '>New Activity<': '>Aktivitas Baru<',
  '>Edit Activity<': '>Edit Aktivitas<',
  '>Delete Activity<': '>Hapus Aktivitas<',
  '>Cancel<': '>Batal<',
  '>Save<': '>Simpan<',
  '>Delete<': '>Hapus<',
  '>Create<': '>Buat<',
  '>Update<': '>Perbarui<',
  '>Title<': '>Judul<',
  '>Description<': '>Deskripsi<',
  '>Date<': '>Tanggal<',
  '>Start Time<': '>Waktu Mulai<',
  '>End Time<': '>Waktu Selesai<',
  '>Location<': '>Lokasi<',
  '>Upload Photo<': '>Unggah Foto<',
  '>Dashboard<': '>Dasbor<',
  '>Settings<': '>Pengaturan<',
  '>Log Out<': '>Keluar<',
  '>Export<': '>Ekspor<',
  '>Preview<': '>Pratinjau<',
  '>Download<': '>Unduh<',
  '>Review<': '>Tinjau<',
  '>Activities<': '>Aktivitas<',
  '>Activity<': '>Aktivitas<',
  'Back to Logbooks': 'Kembali ke Buku Log',
  'Back to ': 'Kembali ke ',
  'No logbooks found': 'Buku log tidak ditemukan',
  'No activities found': 'Aktivitas tidak ditemukan',
  'See All': 'Lihat Semua',
  'Generate Logbook': 'Buat Buku Log',
  'Export to Word': 'Ekspor ke Word',
  'Export to PDF': 'Ekspor ke PDF',
  'Title is required': 'Judul wajib diisi',
  'Date is required': 'Tanggal wajib diisi',
  'Start time is required': 'Waktu mulai wajib diisi',
  'End time is required': 'Waktu selesai wajib diisi',
  'Location is required': 'Lokasi wajib diisi',
  'Description is required': 'Deskripsi wajib diisi',
  'Time must be in format HH:mm': 'Format waktu harus HH:mm',
  'End time must be after start time': 'Waktu selesai harus setelah waktu mulai',
  'Sign in with Google': 'Masuk dengan Google'
};

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('./src');
let changedCount = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let newContent = content;
  
  for (const [en, id] of Object.entries(translations)) {
    newContent = newContent.split(en).join(id);
  }
  
  if (content !== newContent) {
    fs.writeFileSync(file, newContent, 'utf8');
    changedCount++;
    console.log('Updated:', file);
  }
});

console.log('Total files updated:', changedCount);
