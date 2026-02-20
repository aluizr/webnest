import { describe, it, expect, beforeEach } from "vitest";
import {
  checkRateLimit,
  enforceRateLimit,
  getRateLimitInfo,
  RateLimitError,
  resetAllRateLimits,
  resetRateLimit,
} from "../lib/rate-limiter";

describe("rate-limiter", () => {
  beforeEach(() => {
    resetAllRateLimits();
  });

  describe("checkRateLimit", () => {
    it("deve permitir operações dentro do limite", () => {
      // auth:signup permite 3 por 10 min
      expect(checkRateLimit("auth:signup")).toBe(true);
      expect(checkRateLimit("auth:signup")).toBe(true);
      expect(checkRateLimit("auth:signup")).toBe(true);
    });

    it("deve bloquear quando o limite é excedido", () => {
      // auth:signup permite 3 por 10 min
      checkRateLimit("auth:signup");
      checkRateLimit("auth:signup");
      checkRateLimit("auth:signup");
      expect(checkRateLimit("auth:signup")).toBe(false);
    });

    it("deve permitir operações sem limite configurado", () => {
      expect(checkRateLimit("unknown:operation")).toBe(true);
      expect(checkRateLimit("unknown:operation")).toBe(true);
    });

    it("deve tratar operações diferentes de forma independente", () => {
      // Esgotar auth:signup (limite 3)
      checkRateLimit("auth:signup");
      checkRateLimit("auth:signup");
      checkRateLimit("auth:signup");
      expect(checkRateLimit("auth:signup")).toBe(false);

      // auth:signin ainda deve funcionar (limite separado)
      expect(checkRateLimit("auth:signin")).toBe(true);
    });
  });

  describe("enforceRateLimit", () => {
    it("não deve lançar erro dentro do limite", () => {
      expect(() => enforceRateLimit("auth:signup")).not.toThrow();
    });

    it("deve lançar RateLimitError quando exceder limite", () => {
      checkRateLimit("auth:signup");
      checkRateLimit("auth:signup");
      checkRateLimit("auth:signup");

      expect(() => enforceRateLimit("auth:signup")).toThrow(RateLimitError);
    });

    it("deve incluir mensagem informativa no erro", () => {
      checkRateLimit("auth:signup");
      checkRateLimit("auth:signup");
      checkRateLimit("auth:signup");

      try {
        enforceRateLimit("auth:signup");
        expect.fail("Deveria ter lançado erro");
      } catch (e) {
        expect(e).toBeInstanceOf(RateLimitError);
        expect((e as RateLimitError).message).toContain("Muitas requisições");
        expect((e as RateLimitError).operation).toBe("auth:signup");
      }
    });
  });

  describe("getRateLimitInfo", () => {
    it("deve retornar remaining completo quando sem uso", () => {
      const info = getRateLimitInfo("auth:signup");
      expect(info.remaining).toBe(3);
      expect(info.total).toBe(3);
    });

    it("deve decrementar remaining a cada uso", () => {
      checkRateLimit("auth:signup");
      const info = getRateLimitInfo("auth:signup");
      expect(info.remaining).toBe(2);
      expect(info.total).toBe(3);
    });

    it("deve retornar Infinity para operações sem limite", () => {
      const info = getRateLimitInfo("unknown:operation");
      expect(info.remaining).toBe(Infinity);
      expect(info.total).toBe(Infinity);
    });

    it("deve ter resetInMs > 0 quando há uso recente", () => {
      checkRateLimit("auth:signup");
      const info = getRateLimitInfo("auth:signup");
      expect(info.resetInMs).toBeGreaterThan(0);
    });
  });

  describe("resetRateLimit", () => {
    it("deve limpar o rate limit de uma operação", () => {
      checkRateLimit("auth:signup");
      checkRateLimit("auth:signup");
      checkRateLimit("auth:signup");
      expect(checkRateLimit("auth:signup")).toBe(false);

      resetRateLimit("auth:signup");
      expect(checkRateLimit("auth:signup")).toBe(true);
    });
  });

  describe("link operations", () => {
    it("deve permitir 10 criações de link por minuto", () => {
      for (let i = 0; i < 10; i++) {
        expect(checkRateLimit("link:create")).toBe(true);
      }
      expect(checkRateLimit("link:create")).toBe(false);
    });

    it("deve permitir 30 updates por minuto", () => {
      for (let i = 0; i < 30; i++) {
        expect(checkRateLimit("link:update")).toBe(true);
      }
      expect(checkRateLimit("link:update")).toBe(false);
    });
  });
});
