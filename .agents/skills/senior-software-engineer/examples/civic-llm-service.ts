import { GoogleGenAI } from '@google/generative-ai';

export interface DocumentSimplificationRequest {
  documentText: string;
  language: string;
}

export interface SimplifiedDocument {
  summary: string;
  keyPoints: string[];
  requiredDocuments: string[];
}

export class CivicAIPipeline {
  private aiClient: GoogleGenAI;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("AI API Key is required");
    }
    this.aiClient = new GoogleGenAI({ apiKey });
  }

  /**
   * Simplifies a complex civic document and identifies required companion documents.
   */
  async simplifyDocument(req: DocumentSimplificationRequest): Promise<SimplifiedDocument> {
    if (!req.documentText.trim()) {
      throw new Error("Document text cannot be empty");
    }

    const prompt = `
      You are a helpful government companion designed to simplify complex information for citizens.
      Simplify the following document into plain, easy-to-understand terms.
      Target Language: ${req.language}

      Document:
      ${req.documentText}

      Respond strictly in JSON format matching this schema:
      {
        "summary": "Short 2-sentence summary in target language",
        "keyPoints": ["bullet point 1", "bullet point 2"],
        "requiredDocuments": ["document needed 1", "document needed 2"]
      }
    `;

    try {
      const model = this.aiClient.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      
      // Parse LLM response and handle structural errors
      const parsed: SimplifiedDocument = JSON.parse(text);
      if (!parsed.summary || !Array.isArray(parsed.keyPoints) || !Array.isArray(parsed.requiredDocuments)) {
        throw new Error("Invalid output format from GenAI service");
      }
      return parsed;
    } catch (error) {
      console.error("GenAI Document Simplification Error:", error);
      throw new Error("Failed to simplify document due to an internal AI error");
    }
  }
}

// ==========================================
// Jest / Vitest Unit Test Suite
// ==========================================

describe("CivicAIPipeline", () => {
  let mockGenerateContent: jest.Mock;
  let pipeline: CivicAIPipeline;

  beforeEach(() => {
    mockGenerateContent = jest.fn();
    
    // Mock the GoogleGenAI client library structure
    jest.mock('@google/generative-ai', () => {
      return {
        GoogleGenAI: jest.fn().mockImplementation(() => {
          return {
            getGenerativeModel: () => ({
              generateContent: mockGenerateContent,
            }),
          };
        }),
      };
    });

    pipeline = new CivicAIPipeline("mock-api-key");
  });

  it("should return parsed JSON when the model responds correctly", async () => {
    // Arrange
    const mockResponseText = JSON.stringify({
      summary: "This is a simple guide to obtaining a business permit.",
      keyPoints: ["Submit application form", "Pay licensing fee"],
      requiredDocuments: ["ID Proof", "Address Proof"]
    });

    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => mockResponseText,
      },
    });

    // Act
    const result = await pipeline.simplifyDocument({
      documentText: "Complex legal terms about permits...",
      language: "en",
    });

    // Assert
    expect(result.summary).toBe("This is a simple guide to obtaining a business permit.");
    expect(result.keyPoints).toContain("Submit application form");
    expect(mockGenerateContent).toHaveBeenCalled();
  });

  it("should throw an error if the input document is empty", async () => {
    // Act & Assert
    await expect(
      pipeline.simplifyDocument({ documentText: "", language: "en" })
    ).rejects.toThrow("Document text cannot be empty");
  });

  it("should handle invalid JSON from the model gracefully", async () => {
    // Arrange
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => "Invalid non-JSON raw response from LLM",
      },
    });

    // Act & Assert
    await expect(
      pipeline.simplifyDocument({ documentText: "Some text", language: "en" })
    ).rejects.toThrow("Failed to simplify document due to an internal AI error");
  });
});
