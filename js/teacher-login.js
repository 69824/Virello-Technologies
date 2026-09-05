import { onAuthStateChanged, signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import { getProfile, injectStyles, auth } from './virello-academic-core.js';

injectStyles();

const form = document.getElementById('form');
const error = document.getElementById('error');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const button = form?.querySelector('button[type="submit"]');

function isTeacherProfile(profile) {
  const role = String(profile?.role || '').trim().toLowerCase();
  return !!profile && (
    role === 'teacher' ||
    role === 'form_master' ||
    profile.isFormMaster === true
  );
}

async function redirectIfAlreadySignedIn(user) {
  try {
    const profile = await getProfile(user);
    if (isTeacherProfile(profile)) {
      location.href = 'teacher-dashboard.html';
    }
  } catch (err) {
    console.warn('Teacher session check failed:', err);
  }
}

onAuthStateChanged(auth, redirectIfAlreadySignedIn);

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (error) error.textContent = '';
  if (button) {
    button.disabled = true;
    button.textContent = 'Signing In...';
  }

  try {
    const email = String(emailInput?.value || '').trim().toLowerCase();
    const password = String(passwordInput?.value || '');

    if (!email || !password) throw new Error('Please enter your email and password.');

    const credential = await signInWithEmailAndPassword(auth, email, password);
    const profile = await getProfile(credential.user);

    if (!isTeacherProfile(profile)) {
      throw new Error('This account is not registered as a teacher or Form Master.');
    }

    const status = String(profile.status || 'active').trim().toLowerCase();
    if (['inactive', 'disabled', 'suspended'].includes(status)) {
      throw new Error('This teacher account is inactive. Please contact your administrator.');
    }

    location.href = 'teacher-dashboard.html';
  } catch (err) {
    console.error('Teacher login error:', err);
    if (error) {
      error.textContent = String(err?.message || 'Unable to sign in.')
        .replace(/^Firebase:\s*/i, '')
        .replace(/\s*\(auth\/[^)]+\)\.?$/i, '');
    }
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = 'Sign In';
    }
  }
});
