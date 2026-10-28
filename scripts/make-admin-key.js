#!/usr/bin/env node
'use strict';
/** Prints a fresh random admin token (48 characters). Paste it into Vercel as ADMIN_TOKEN and into your password manager. */
const crypto = require('crypto');

process.stdout.write(`${crypto.randomBytes(36).toString('base64url')}\n`);
