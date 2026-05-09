import React, {useEffect, useState} from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import {useDispatch} from 'react-redux';
import {ArrowRight, Eye, EyeOff, Lock, Mail, Sparkles} from 'lucide-react-native';
import Svg, {Path} from 'react-native-svg';
import {Text} from 'react-native-paper';
import {
  loginFailure,
  loginStart,
  loginSuccess,
} from '../../store/slices/authSlice';
import {GOOGLE_WEB_CLIENT_ID, STORAGE_KEYS} from '../../utils/constants';
import {googleAuth, loginUser, registerUser} from '../../services/apiService';
import {COLORS, FONT_FAMILY} from '../../theme/theme';
import {HeroCard, IconBubble, SurfaceCard, gradientStyle} from '../../components/KoboUI';

GoogleSignin.configure({
  ...(GOOGLE_WEB_CLIENT_ID ? {webClientId: GOOGLE_WEB_CLIENT_ID} : {}),
  offlineAccess: false,
});

function GoogleG() {
  return (
    <Svg width={18} height={18} viewBox="0 0 48 48">
      <Path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <Path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <Path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <Path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </Svg>
  );
}

function LoginScreen({navigation, route}) {
  const dispatch = useDispatch();
  const [email, setEmail] = useState(route.params?.registeredEmail || '');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  useEffect(() => {
    if (route.params?.registeredEmail) {
      setEmail(route.params.registeredEmail);
    }
  }, [route.params?.registeredEmail]);

  const validateForm = () => {
    const nextErrors = {};
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email.trim()) {
      nextErrors.email = 'Email address is required.';
    } else if (!emailPattern.test(email.trim())) {
      nextErrors.email = 'Enter a valid email address.';
    }

    if (!password) {
      nextErrors.password = 'Password is required.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const saveAuthSession = async (token, user) => {
    await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    dispatch(loginSuccess({user, token}));
  };

  const handleLogin = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    dispatch(loginStart());

    try {
      const normalizedEmail = email.trim().toLowerCase();

      if (Platform.OS === 'web') {
        const token = `web-preview-token-${Date.now()}`;
        const safeUser = {
          id: normalizedEmail,
          name: normalizedEmail.split('@')[0],
          email: normalizedEmail,
        };

        await saveAuthSession(token, safeUser);
        return;
      }

      let response;

      try {
        response = await loginUser({email: normalizedEmail, password});
      } catch (loginError) {
        if (Platform.OS !== 'web' || loginError?.response?.status !== 401) {
          throw loginError;
        }

        response = await registerUser({
          name: normalizedEmail.split('@')[0],
          email: normalizedEmail,
          password,
        });
      }

      if (![200, 201].includes(response.status)) {
        const message = response?.data?.message || 'Invalid email or password.';
        setErrors({form: message});
        dispatch(loginFailure(message));
        Alert.alert('Login failed', message);
        return;
      }

      const token = response?.data?.token;
      const safeUser = response?.data?.user;

      if (!token || !safeUser) {
        const message =
          'Login succeeded but the server did not return login details.';
        setErrors({form: message});
        dispatch(loginFailure(message));
        Alert.alert('Login failed', message);
        return;
      }

      await saveAuthSession(token, safeUser);
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        'Login failed. Please try again.';

      console.error('[LoginScreen] Login failed:', error);
      setErrors({form: message});
      dispatch(loginFailure(message));
      Alert.alert('Login failed', message);
    } finally {
      setIsLoading(false);
    }
  };

  const getGoogleIdToken = googleResponse =>
    googleResponse?.idToken || googleResponse?.data?.idToken;

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    dispatch(loginStart());
    setErrors(current => ({...current, form: ''}));

    try {
      if (Platform.OS === 'android') {
        await GoogleSignin.hasPlayServices({
          showPlayServicesUpdateDialog: true,
        });
      }

      const googleResponse = await GoogleSignin.signIn();
      const idToken = getGoogleIdToken(googleResponse);

      if (!idToken) {
        const message =
          'Google did not return an idToken. Check GOOGLE_WEB_CLIENT_ID.';
        setErrors({form: message});
        dispatch(loginFailure(message));
        Alert.alert('Google sign-in failed', message);
        return;
      }

      const response = await googleAuth(idToken);

      if (![200, 201].includes(response.status)) {
        const message =
          response?.data?.message || 'Google sign-in failed. Please try again.';
        setErrors({form: message});
        dispatch(loginFailure(message));
        Alert.alert('Google sign-in failed', message);
        return;
      }

      const token = response?.data?.token;
      const user = response?.data?.user;

      if (!token || !user) {
        const message =
          'Google sign-in succeeded but the server did not return login details.';
        setErrors({form: message});
        dispatch(loginFailure(message));
        Alert.alert('Google sign-in failed', message);
        return;
      }

      await saveAuthSession(token, user);
    } catch (error) {
      if (error?.code === statusCodes.SIGN_IN_CANCELLED) {
        dispatch(loginFailure(null));
        return;
      }

      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        'Google sign-in failed. Please try again.';

      console.error('[LoginScreen] Google sign-in failed:', error);
      setErrors({form: message});
      dispatch(loginFailure(message));
      Alert.alert('Google sign-in failed', message);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        <View style={styles.brandRow}>
          <Image 
            source={require('../../assets/images/app_icon.png')} 
            style={{width: 42, height: 42}} 
            resizeMode="contain" 
          />
          <Text style={styles.wordmark}>OJAT</Text>
        </View>

        <HeroCard style={styles.hero}>
          <Text style={styles.heroEyebrow}>WELCOME BACK</Text>
          <Text style={styles.heroTitle}>Sign in to OJAT</Text>
          <Text style={styles.heroSubtitle}>
            Premium offline-first sales, inventory, expenses, reports, and cloud sync for modern businesses.
          </Text>
        </HeroCard>

        <SurfaceCard style={styles.formCard}>
          <FloatField
            label="Email"
            icon={Mail}
            value={email}
            onChangeText={value => {
              setEmail(value);
              setErrors(current => ({...current, email: '', form: ''}));
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
          />
          <FloatField
            label="Password"
            icon={Lock}
            value={password}
            onChangeText={value => {
              setPassword(value);
              setErrors(current => ({...current, password: '', form: ''}));
            }}
            secureTextEntry={!showPassword}
            error={errors.password}
            trailing={
              <TouchableOpacity onPress={() => setShowPassword(value => !value)}>
                {showPassword ? (
                  <EyeOff color={COLORS.muted} size={20} />
                ) : (
                  <Eye color={COLORS.muted} size={20} />
                )}
              </TouchableOpacity>
            }
          />

          <View style={styles.formOptions}>
            <TouchableOpacity
              activeOpacity={0.84}
              onPress={() => setRemember(value => !value)}
              style={styles.rememberRow}>
              <View style={[styles.checkbox, remember && gradientStyle('primary')]} />
              <Text style={styles.rememberText}>Remember me</Text>
            </TouchableOpacity>
            <Text style={styles.linkText}>Forgot password?</Text>
          </View>

          {errors.form ? <Text style={styles.formError}>{errors.form}</Text> : null}

          <TouchableOpacity
            activeOpacity={0.86}
            onPress={handleLogin}
            disabled={isLoading || isGoogleLoading}
            style={[styles.primaryButton, gradientStyle('primary')]}>
            <Text style={styles.primaryButtonText}>
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Text>
            <ArrowRight color={COLORS.primaryForeground} size={19} />
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.divider} />
          </View>

          <TouchableOpacity
            activeOpacity={0.84}
            onPress={handleGoogleSignIn}
            disabled={isLoading || isGoogleLoading}
            style={styles.googleButton}>
            <GoogleG />
            <Text style={styles.googleButtonText}>
              {isGoogleLoading ? 'Connecting...' : 'Continue with Google'}
            </Text>
          </TouchableOpacity>
        </SurfaceCard>

        <View style={styles.footer}>
          <Text style={styles.footerText}>New here?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.footerLink}>Create an account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function FloatField({label, icon: FieldIcon, error, trailing, ...inputProps}) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.inputWrap, error && styles.inputError]}>
        <FieldIcon color={COLORS.muted} size={19} style={styles.inputIcon} />
        <TextInput
          {...inputProps}
          placeholder={label}
          placeholderTextColor={COLORS.muted}
          style={styles.input}
        />
        {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background,
    flex: 1,
  },
  content: {
    alignSelf: 'center',
    flexGrow: 1,
    justifyContent: 'center',
    maxWidth: 448,
    padding: 20,
    width: '100%',
  },
  brandRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  wordmark: {
    color: COLORS.text,
    fontFamily: FONT_FAMILY,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  hero: {
    marginBottom: 16,
  },
  heroEyebrow: {
    color: COLORS.primaryForeground,
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  heroTitle: {
    color: COLORS.primaryForeground,
    fontFamily: FONT_FAMILY,
    fontSize: 27,
    fontWeight: '800',
    marginTop: 9,
  },
  heroSubtitle: {
    color: COLORS.primaryForeground,
    fontFamily: FONT_FAMILY,
    lineHeight: 21,
    marginTop: 6,
    opacity: 0.82,
  },
  formCard: {
    gap: 12,
  },
  fieldBlock: {
    gap: 6,
  },
  fieldLabel: {
    color: COLORS.muted,
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  inputWrap: {
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderColor: COLORS.line,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 52,
  },
  inputError: {
    borderColor: COLORS.danger,
  },
  inputIcon: {
    marginLeft: 15,
  },
  input: {
    color: COLORS.text,
    flex: 1,
    fontFamily: FONT_FAMILY,
    fontSize: 15,
    minHeight: 50,
    paddingHorizontal: 12,
  },
  trailing: {
    paddingRight: 14,
  },
  errorText: {
    color: COLORS.danger,
    fontFamily: FONT_FAMILY,
    fontSize: 12,
  },
  formOptions: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rememberRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  checkbox: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.line,
    borderRadius: 6,
    borderWidth: 1,
    height: 18,
    width: 18,
  },
  rememberText: {
    color: COLORS.muted,
    fontFamily: FONT_FAMILY,
    fontSize: 13,
    fontWeight: '700',
  },
  linkText: {
    color: COLORS.primary,
    fontFamily: FONT_FAMILY,
    fontSize: 13,
    fontWeight: '800',
  },
  formError: {
    color: COLORS.danger,
    fontFamily: FONT_FAMILY,
    fontSize: 12,
  },
  primaryButton: {
    alignItems: 'center',
    borderRadius: 18,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 52,
  },
  primaryButtonText: {
    color: COLORS.primaryForeground,
    fontFamily: FONT_FAMILY,
    fontSize: 15,
    fontWeight: '800',
  },
  dividerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginVertical: 2,
  },
  divider: {
    backgroundColor: COLORS.line,
    flex: 1,
    height: 1,
  },
  dividerText: {
    color: COLORS.muted,
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    fontWeight: '800',
  },
  googleButton: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderColor: COLORS.line,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    minHeight: 52,
  },
  googleButtonText: {
    color: COLORS.text,
    fontFamily: FONT_FAMILY,
    fontWeight: '800',
  },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    marginTop: 18,
  },
  footerText: {
    color: COLORS.muted,
    fontFamily: FONT_FAMILY,
  },
  footerLink: {
    color: COLORS.primary,
    fontFamily: FONT_FAMILY,
    fontWeight: '800',
  },
});

export default LoginScreen;
