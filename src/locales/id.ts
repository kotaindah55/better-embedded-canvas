export default {
	noNodeFound: 'Kartu tidak ada',
	tooltipOpenCanvas: 'Buka kanvas',
	tooltipEnableInteraction: 'Nyalakan interaksi',
	tooltipDisableInteraction: 'Matikan interaksi',
	buttonReload: 'Muat ulang',
	buttonDismiss: 'Abaikan',
	editor: {
		suggestion: {
			noMatchedNode: 'Tidak ada kartu yang cocok'
		}
	},
	command: {
		embedCanvas: 'Sematkan kanvas',
		embedCanvasNode: 'Sematkan kartu kanvas'
	},
	notice: {
		reloadAfterDisable: 'Disarankan untuk memuat ulang seluruh catatan dan kanvas yang terbuka setelah menonaktifkan atau menghapus plugin Better Embedded Canvas (data Anda data tetap terjaga).',
		restartApp: 'Mulai ulang aplikasi untuk memastikan plugin Better Embedded Canvas berjalan dengan baik.',
		canvasIsDisabled: 'Plugin Canvas dinonaktifkan. Aktifkan melalui “Pengaturan → Plugin inti” lalu mulai ulang aplikasi.'
	},
	setting: {
		showCanvasName: {
			name: 'Tampilkan judul kanvas',
			desc: 'Tampilkan nama kanvas sebagai judul sematan.'
		},
		spaceKeyToPan: {
			name: 'Tekan “Spasi” untuk menggeser',
			desc: 'Tekan “Spasi” dan seret kanvas yang disematkan untuk menggesernya. Kanvas yang disematkan di dalam kanvas lain, baik secara langsung maupun melalui catatan yang disematkan, tidak dapat menggunakan metode ini.'
		},
		nestedCanvas: {
			name: 'Kanvas dalam kanvas',
			desc: 'Sematkan kanvas interaktif di dalam kanvas. Nonaktifkan fitur ini jika ingin menyematkan kanvas statis.'
		},
		maxEmbedDepth: {
			name: 'Kedalaman penyematan',
			desc: 'Seberapa dalam penyematan kanvas di dalam catatan atau kanvas lain. Setel ke 0 untuk menggunakan kanvas static secara paksa (sebagaimana yang kamu lihat ketika plugin ini dinonaktifkan).'
		},
		embedNodeContentOnly: {
			name: 'Hanya sematkan konten dari kartu',
			desc: 'Cukup sematkan konten kartu tanpa menampilkan antarmuka kanvas interaktif. Tidak berlaku pada kartu grup.'
		},
		embedGroupContentOnly: {
			name: 'Sematkan konten grup tanpa grupnya',
			desc: 'Sembunyikan grup dan cukup tampilkan kartu-kartu di dalamnya.'
		}
	},
	settingHeading: {
		nodeEmbed: 'Sematan kartu'
	}
};
