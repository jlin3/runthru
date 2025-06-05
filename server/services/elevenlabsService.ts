import fs from "fs";
import path from "path";

export class ElevenLabsService {
  private apiKey: string;
  private baseUrl = "https://api.elevenlabs.io/v1";

  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY || process.env.ELEVENLABS_API_KEY_ENV_VAR || "default_key";
  }

  async generateSpeech(text: string, voice: string = "Rachel", speed: number = 1.0): Promise<string> {
    try {
      // Voice ID mapping for ElevenLabs
      const voiceIds: Record<string, string> = {
        "Rachel": "21m00Tcm4TlvDq8ikWAM",
        "Adam": "pNInz6obpgDQGcFmaJgB",
        "Josh": "TxGEqnHWrfWFTfGW9XjX",
        "Elli": "MF3mGyEYCl7XYWbV9V6O"
      };

      const voiceId = voiceIds[voice] || voiceIds["Rachel"];
      
      const response = await fetch(`${this.baseUrl}/text-to-speech/${voiceId}`, {
        method: "POST",
        headers: {
          "Accept": "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": this.apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_monolingual_v1",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
            speed: speed,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      // Save audio file
      const audioBuffer = await response.arrayBuffer();
      const fileName = `narration_${Date.now()}.mp3`;
      const filePath = path.join(process.cwd(), "uploads", fileName);
      
      // Ensure uploads directory exists
      const uploadsDir = path.dirname(filePath);
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      fs.writeFileSync(filePath, Buffer.from(audioBuffer));
      return filePath;
    } catch (error) {
      console.error("Error generating speech:", error);
      throw new Error("Failed to generate speech");
    }
  }
}

export const elevenlabsService = new ElevenLabsService();
