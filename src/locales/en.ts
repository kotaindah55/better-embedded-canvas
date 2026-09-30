export default {
	noNodeFound: 'Card does not exist',
	tooltipOpenCanvas: 'Open canvas',
	tooltipEnableInteraction: 'Enable interaction',
	tooltipDisableInteraction: 'Disable interaction',
	buttonReload: 'Reload',
	buttonDismiss: 'Dismiss',
	editor: {
		suggestion: {
			noMatchedNode: 'No matched card'
		}
	},
	command: {
		embedCanvas: 'Embed canvas',
		embedCanvasNode: 'Embed canvas card'
	},
	notice: {
		reloadAfterDisable: 'It is recommended to reload all open notes and canvases after disable or uninstall Better Embedded Canvas plugin (your data are preserved).',
		restartApp: 'Restart the app to ensure the Better Embedded Canvas plugin runs properly.',
		canvasIsDisabled: 'Canvas plugin is disabled. Enable it under “Settings → Core plugins” and restart the app.'
	},
	setting: {
		showCanvasName: {
			name: 'Show canvas title',
			desc: 'Show canvas name as embed title.'
		},
		spaceKeyToPan: {
			name: 'Press “Space” key to pan',
			desc: 'Press “Space” key and drag the embedded canvas to move it. Canvas that is embedded inside another canvas, whether directly or via an embedded note, cannot use this method.'
		},
		nestedCanvas: {
			name: 'Nested canvas',
			desc: 'Embed interactive canvas inside another canvas. Disable it to embed static canvas instead.'
		},
		maxEmbedDepth: {
			name: 'Embedding depth',
			desc: 'How deeply can a canvas be embedded within note or another canvas. Set it to 0 to forcibly use static canvas (as you would get when you disable this plugin).'
		},
		embedNodeContentOnly: {
			name: 'Embed card content only',
			desc: 'Embed only content of a canvas card instead of preserving the whole interface of interactive canvas. This does not apply to group cards.'
		},
		embedGroupContentOnly: {
			name: 'Embed cards without its group',
			desc: 'Hide group card while only show the cards inside.'
		}
	},
	settingHeading: {
		nodeEmbed: 'Card embed'
	}
};
