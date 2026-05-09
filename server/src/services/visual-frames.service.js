import os from 'os';
import path from 'path';
import { promisify } from 'util';
import { execFile } from 'child_process';
import { mkdtemp, readdir, readFile, rm } from 'fs/promises';
import {
  FRAME_INTERVAL_SECONDS,
  MAX_FRAMES,
} from '../config/env.js';

const execFileAsync = promisify(execFile);

async function commandExists(command) {
  try {
    await execFileAsync('which', [command]);
    return true;
  } catch {
    return false;
  }
}

export async function sampleFramesForVideo(videoId) {
  const hasFfmpeg = await commandExists('ffmpeg');
  const hasYtDlp = await commandExists('yt-dlp');
  if (!hasFfmpeg || !hasYtDlp) {
    throw new Error('ffmpeg or yt-dlp is not available for visual extraction.');
  }

  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'lms-frames-'));
  const videoPath = path.join(tmpDir, `${videoId}.mp4`);
  const framePattern = path.join(tmpDir, 'frame-%03d.jpg');

  try {
    await execFileAsync('yt-dlp', [
      '-f',
      'bv*[height<=360]+ba/b[height<=360]/b',
      '-o',
      videoPath,
      '--no-playlist',
      url,
    ]);

    await execFileAsync('ffmpeg', [
      '-hide_banner',
      '-loglevel',
      'error',
      '-i',
      videoPath,
      '-vf',
      `fps=1/${FRAME_INTERVAL_SECONDS}`,
      '-frames:v',
      String(MAX_FRAMES),
      framePattern,
    ]);

    const names = (await readdir(tmpDir))
      .filter((name) => /^frame-\d+\.jpg$/.test(name))
      .sort();

    return Promise.all(
      names.map(async (name, index) => ({
        timestamp: index * FRAME_INTERVAL_SECONDS,
        imageBase64: (await readFile(path.join(tmpDir, name))).toString('base64'),
      }))
    );
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
}

export async function fetchVideoMetadata(videoId) {
  const hasYtDlp = await commandExists('yt-dlp');
  if (!hasYtDlp) return null;

  try {
    const { stdout } = await execFileAsync('yt-dlp', [
      '--dump-single-json',
      '--skip-download',
      `https://www.youtube.com/watch?v=${videoId}`,
    ]);
    const data = JSON.parse(stdout);
    return {
      title: data?.title ?? '',
      channel: data?.channel ?? data?.uploader ?? '',
      uploader: data?.uploader ?? '',
      webpageUrl: data?.webpage_url ?? `https://www.youtube.com/watch?v=${videoId}`,
    };
  } catch {
    return null;
  }
}
