interface TtsVoiceOption {
  id: string;
  name: string;
  styleKey: string;
}

const voice = (id: string, styleKey: string): TtsVoiceOption => ({
  id,
  name: id,
  styleKey,
});

export const AVAILABLE_TTS_VOICES: TtsVoiceOption[] = [
  voice('Zephyr', 'tts_style_bright'),
  voice('Puck', 'tts_style_upbeat'),
  voice('Charon', 'tts_style_informative'),
  voice('Kore', 'tts_style_firm'),
  voice('Fenrir', 'tts_style_excitable'),
  voice('Leda', 'tts_style_youthful'),
  voice('Orus', 'tts_style_firm'),
  voice('Aoede', 'tts_style_breezy'),
  voice('Callirrhoe', 'tts_style_easy_going'),
  voice('Autonoe', 'tts_style_bright'),
  voice('Enceladus', 'tts_style_breathy'),
  voice('Iapetus', 'tts_style_clear'),
  voice('Umbriel', 'tts_style_easy_going'),
  voice('Algieba', 'tts_style_smooth'),
  voice('Despina', 'tts_style_smooth'),
  voice('Erinome', 'tts_style_clear'),
  voice('Algenib', 'tts_style_gravelly'),
  voice('Rasalgethi', 'tts_style_informative'),
  voice('Laomedeia', 'tts_style_upbeat'),
  voice('Achernar', 'tts_style_soft'),
  voice('Alnilam', 'tts_style_firm'),
  voice('Schedar', 'tts_style_even'),
  voice('Gacrux', 'tts_style_mature'),
  voice('Pulcherrima', 'tts_style_forward'),
  voice('Achird', 'tts_style_friendly'),
  voice('Zubenelgenubi', 'tts_style_casual'),
  voice('Vindemiatrix', 'tts_style_gentle'),
  voice('Sadachbia', 'tts_style_lively'),
  voice('Sadaltager', 'tts_style_knowledgeable'),
  voice('Sulafat', 'tts_style_warm'),
];
