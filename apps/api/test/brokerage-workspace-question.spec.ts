import { describe, it, expect } from 'vitest';
import {
  formatBrokerageWorkspaceReply,
  isBrokerageOrWorkspaceNameQuestion,
  looksLikeBrokerageNameQuestionLoose,
} from '../src/modules/messaging/brokerage-workspace-question.util';

describe('brokerage-workspace-question.util', () => {
  it('detects "what is my brokerage\'s name"', () => {
    expect(isBrokerageOrWorkspaceNameQuestion("What is my brokerage's name?")).toBe(true);
  });

  it('detects "what is my brokerage name"', () => {
    expect(isBrokerageOrWorkspaceNameQuestion('What is my brokerage name')).toBe(true);
  });

  it('formats reply with workspace name', () => {
    expect(formatBrokerageWorkspaceReply('Acme Realty')).toContain('Acme Realty');
  });

  it('detects informal brokerage questions', () => {
    expect(isBrokerageOrWorkspaceNameQuestion('Hey, what brokerage is this?')).toBe(true);
    expect(isBrokerageOrWorkspaceNameQuestion('Which brokerage am I on?')).toBe(true);
  });

  it('ignores unrelated deal questions', () => {
    expect(isBrokerageOrWorkspaceNameQuestion("What's the list price?")).toBe(false);
  });

  it('strips zero-width characters before matching', () => {
    expect(
      isBrokerageOrWorkspaceNameQuestion(
        '\u200BWhat is my brokerage name\uFEFF',
      ),
    ).toBe(true);
  });

  it('NFKC normalizes fullwidth letters so word boundaries match', () => {
    expect(isBrokerageOrWorkspaceNameQuestion('Ｗhat is my brokerage name')).toBe(true);
  });

  it('looksLikeBrokerageNameQuestionLoose matches my brokerage without strict edge case', () => {
    expect(looksLikeBrokerageNameQuestionLoose('What is my brokerage name?')).toBe(true);
  });

  it('looksLikeBrokerageNameQuestionLoose ignores random brokerage mentions', () => {
    expect(looksLikeBrokerageNameQuestionLoose('Did you call the brokerage?')).toBe(false);
  });
});
