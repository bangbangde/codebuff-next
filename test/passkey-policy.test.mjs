import assert from "node:assert/strict";
import { describe, it } from "node:test";

// Node strips the imported policy module's erasable TypeScript syntax.
import {
  authenticationWasUserVerified,
  canRemovePasskey,
  getPasskeyRelyingPartyId,
  registrationWasUserVerified,
  requireUserVerificationInRequestOptions,
} from "../lib/auth/passkey-policy.ts";

describe("getPasskeyRelyingPartyId", () => {
  it("accepts the origin hostname", () => {
    assert.equal(
      getPasskeyRelyingPartyId(
        new URL("https://login.example.com"),
        "LOGIN.EXAMPLE.COM ",
      ),
      "login.example.com",
    );
  });

  it("accepts a parent relying party domain", () => {
    assert.equal(
      getPasskeyRelyingPartyId(
        new URL("https://login.example.com"),
        "example.com",
      ),
      "example.com",
    );
  });

  it("accepts localhost for local development", () => {
    assert.equal(
      getPasskeyRelyingPartyId(
        new URL("http://localhost:3000"),
        "localhost",
      ),
      "localhost",
    );
  });

  it("rejects missing, malformed, and unrelated relying party IDs", () => {
    assert.throws(
      () =>
        getPasskeyRelyingPartyId(
          new URL("https://login.example.com"),
          undefined,
        ),
      /PASSKEY_RP_ID/,
    );
    assert.throws(
      () =>
        getPasskeyRelyingPartyId(
          new URL("https://login.example.com"),
          "https://example.com",
        ),
      /valid hostname/,
    );
    assert.throws(
      () =>
        getPasskeyRelyingPartyId(
          new URL("https://login.example.com"),
          "example.net",
        ),
      /BETTER_AUTH_URL/,
    );
  });
});

describe("passkey user-verification policy", () => {
  it("only accepts explicit user verification", () => {
    assert.equal(
      registrationWasUserVerified({
        registrationInfo: { userVerified: true },
      }),
      true,
    );
    assert.equal(
      registrationWasUserVerified({
        registrationInfo: { userVerified: false },
      }),
      false,
    );
    assert.equal(registrationWasUserVerified({}), false);

    assert.equal(
      authenticationWasUserVerified({
        authenticationInfo: { userVerified: true },
      }),
      true,
    );
    assert.equal(
      authenticationWasUserVerified({
        authenticationInfo: { userVerified: false },
      }),
      false,
    );
    assert.equal(authenticationWasUserVerified({}), false);
  });

  it("hardens valid authentication options without mutating the source", () => {
    const source = {
      challenge: "challenge",
      timeout: 60_000,
      userVerification: "preferred",
    };

    assert.deepEqual(requireUserVerificationInRequestOptions(source), {
      challenge: "challenge",
      timeout: 60_000,
      userVerification: "required",
    });
    assert.equal(source.userVerification, "preferred");
  });

  it("does not replace an unrecognized response payload", () => {
    assert.equal(requireUserVerificationInRequestOptions(null), null);
    assert.equal(
      requireUserVerificationInRequestOptions({ challenge: 123 }),
      null,
    );
  });
});

describe("passkey removal policy", () => {
  it("allows removal when another passkey or password remains", () => {
    assert.equal(
      canRemovePasskey({
        passkeyCount: 2,
        hasCredentialPassword: false,
      }),
      true,
    );
    assert.equal(
      canRemovePasskey({
        passkeyCount: 1,
        hasCredentialPassword: true,
      }),
      true,
    );
  });

  it("protects the last passkey on a passwordless account", () => {
    assert.equal(
      canRemovePasskey({
        passkeyCount: 1,
        hasCredentialPassword: false,
      }),
      false,
    );
  });
});
