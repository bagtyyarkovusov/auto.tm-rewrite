#!/usr/bin/env node
// Worktree cleanup gate as code (issue #482). Red-checkpoint stub: the export
// shapes exist so the unit tests fail on behavior, not on imports.

export function parseWorktreePorcelain() {
  return [];
}

export function classifyWorktree() {
  return { verdict: "keep", reason: "not implemented", pr: null };
}

export function findStaleBranches() {
  return [];
}

export function findStaleRailwayEnvironments() {
  return { closed: [], unknown: [] };
}

export function planApply() {
  return [];
}

export function runApply() {
  return { done: [], failed: null, skipped: [] };
}

export function formatReport() {
  return "";
}
