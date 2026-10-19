/**
 * Districts by state, and mukim suggestions for some districts, for the land and building forms.
 *
 * Districts are a closed list (with "Other" for anything missing). Mukims are only suggestions:
 * the owner may type any name, because it must be spelled as on the title. Sarawak titles use land
 * districts and blocks rather than administrative districts and mukims, so Sarawak has no list.
 * Check against the JKPTG / state land office lists before relying on them.
 */
export const DISTRICTS_BY_STATE: Record<string, string[]> = {
  Johor: ['Batu Pahat', 'Johor Bahru', 'Kluang', 'Kota Tinggi', 'Kulai', 'Mersing', 'Muar', 'Pontian', 'Segamat', 'Tangkak'],
  Kedah: ['Baling', 'Bandar Baharu', 'Kota Setar', 'Kuala Muda', 'Kubang Pasu', 'Kulim', 'Langkawi', 'Padang Terap', 'Pendang', 'Pokok Sena', 'Sik', 'Yan'],
  Kelantan: ['Bachok', 'Gua Musang', 'Jeli', 'Kecil Lojing', 'Kota Bharu', 'Kuala Krai', 'Machang', 'Pasir Mas', 'Pasir Puteh', 'Tanah Merah', 'Tumpat'],
  Melaka: ['Alor Gajah', 'Jasin', 'Melaka Tengah'],
  'Negeri Sembilan': ['Jelebu', 'Jempol', 'Kuala Pilah', 'Port Dickson', 'Rembau', 'Seremban', 'Tampin'],
  Pahang: ['Bentong', 'Bera', 'Cameron Highlands', 'Jerantut', 'Kuantan', 'Lipis', 'Maran', 'Pekan', 'Raub', 'Rompin', 'Temerloh'],
  Perak: ['Bagan Datuk', 'Batang Padang', 'Hilir Perak', 'Hulu Perak', 'Kampar', 'Kerian', 'Kinta', 'Kuala Kangsar', 'Larut, Matang dan Selama', 'Manjung', 'Muallim', 'Perak Tengah'],
  Perlis: ['Perlis'],
  'Pulau Pinang': ['Barat Daya', 'Seberang Perai Selatan', 'Seberang Perai Tengah', 'Seberang Perai Utara', 'Timur Laut'],
  Sabah: ['Beaufort', 'Beluran', 'Kalabakan', 'Keningau', 'Kinabatangan', 'Kota Belud', 'Kota Kinabalu', 'Kota Marudu', 'Kuala Penyu', 'Kudat', 'Kunak', 'Lahad Datu', 'Nabawan', 'Papar', 'Penampang', 'Pitas', 'Putatan', 'Ranau', 'Sandakan', 'Semporna', 'Sipitang', 'Tambunan', 'Tawau', 'Telupid', 'Tenom', 'Tongod', 'Tuaran'],
  Selangor: ['Gombak', 'Hulu Langat', 'Hulu Selangor', 'Klang', 'Kuala Langat', 'Kuala Selangor', 'Petaling', 'Sabak Bernam', 'Sepang'],
  Terengganu: ['Besut', 'Dungun', 'Hulu Terengganu', 'Kemaman', 'Kuala Nerus', 'Kuala Terengganu', 'Marang', 'Setiu'],
  'Wilayah Persekutuan Kuala Lumpur': ['Kuala Lumpur'],
  'Wilayah Persekutuan Labuan': ['Labuan'],
  'Wilayah Persekutuan Putrajaya': ['Putrajaya'],
};

/** Mukim suggestions, keyed "State|District". Districts not listed get no suggestions yet. */
export const MUKIM_SUGGESTIONS: Record<string, string[]> = {
  'Selangor|Gombak': ['Batu', 'Hulu Kelang', 'Kuang', 'Rawang', 'Setapak'],
  'Selangor|Hulu Langat': ['Ampang', 'Beranang', 'Cheras', 'Hulu Langat', 'Hulu Semenyih', 'Kajang', 'Semenyih'],
  'Selangor|Hulu Selangor': ['Ampang Pechah', 'Batang Kali', 'Buloh Telor', 'Hulu Bernam', 'Hulu Yam', 'Kalumpang', 'Kerling', 'Kuala Kalumpang', 'Peretak', 'Rasa', 'Serendah', 'Sungai Gumut', 'Sungai Tinggi'],
  'Selangor|Klang': ['Kapar', 'Klang'],
  'Selangor|Kuala Langat': ['Bandar', 'Batu', 'Jugra', 'Kelanang', 'Morib', 'Tanjung Dua Belas', 'Telok Panglima Garang'],
  'Selangor|Kuala Selangor': ['Api-Api', 'Batang Berjuntai', 'Ijok', 'Jeram', 'Kuala Selangor', 'Pasangan', 'Tanjong Karang', 'Ujong Permatang'],
  'Selangor|Petaling': ['Bukit Raja', 'Damansara', 'Petaling', 'Sungai Buloh'],
  'Selangor|Sabak Bernam': ['Bagan Nakhoda Omar', 'Pancang Bedena', 'Pasir Panjang', 'Sabak', 'Sungai Panjang'],
  'Selangor|Sepang': ['Dengkil', 'Labu', 'Sepang'],
  'Negeri Sembilan|Jempol': ['Jelai', 'Kuala Jempol', 'Rompin', 'Serting Ilir', 'Serting Ulu'],
  'Negeri Sembilan|Port Dickson': ['Jimah', 'Linggi', 'Pasir Panjang', 'Port Dickson', 'Si Rusa'],
  'Negeri Sembilan|Seremban': ['Ampangan', 'Labu', 'Lenggeng', 'Pantai', 'Rantau', 'Rasah', 'Seremban', 'Setul'],
  'Negeri Sembilan|Tampin': ['Ayer Kuning', 'Gemencheh', 'Keru', 'Repah', 'Tampin Tengah', 'Tebong'],
  'Johor|Batu Pahat': ['Bagan', 'Chaah Baru', 'Kampung Bahru', 'Linau', 'Lubok', 'Minyak Beku', 'Peserai', 'Simpang Kanan', 'Simpang Kiri', 'Sri Gading', 'Sri Medan', 'Sungai Kluang', 'Sungai Punggor', 'Tanjung Sembrong'],
  'Johor|Johor Bahru': ['Bandar Johor Bahru', 'Jelutong', 'Plentong', 'Pulai', 'Sungai Tiram', 'Tanjung Kupang', 'Tebrau'],
  'Johor|Kluang': ['Kahang', 'Kluang', 'Layang-Layang', 'Machap', 'Niyor', 'Paloh', 'Renggam', 'Ulu Benut'],
  'Johor|Kota Tinggi': ['Johor Lama', 'Kambau', 'Kota Tinggi', 'Pantai Timur', 'Pengerang', 'Sedili Besar', 'Sedili Kecil', 'Tanjung Surat', 'Ulu Sungai Johor', 'Ulu Sungai Sedili Besar'],
  'Johor|Kulai': ['Bukit Batu', 'Kulai', 'Sedenak', 'Senai'],
  'Johor|Pontian': ['Air Masin', 'Api-Api', 'Ayer Baloi', 'Benut', 'Jeram Batu', 'Pengkalan Raja', 'Pontian', 'Rimba Terjun', 'Serkat', 'Sungai Karang', 'Sungai Pinggan'],
};

/** Sabah and Sarawak titles are not divided into mukims. Mirrors usesMukim() on the server. */
export function usesMukim(state: string | undefined): boolean {
  return state !== 'Sabah' && state !== 'Sarawak';
}

/** What the title calls the district and the area inside it, by state. */
export function locationLabels(state: string | undefined): { district: string; mukim: string; mukimPlaceholder: string } {
  if (state === 'Sarawak') return { district: 'Land district', mukim: 'Block (optional)', mukimPlaceholder: 'e.g. Block 11 Muara Tebas' };
  if (state === 'Sabah') return { district: 'District', mukim: 'Town or area (optional)', mukimPlaceholder: 'e.g. Inanam' };
  return { district: 'District', mukim: 'Mukim / town', mukimPlaceholder: 'Type or choose' };
}
