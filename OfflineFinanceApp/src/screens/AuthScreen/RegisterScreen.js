import React, {useState} from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Button,
  HelperText,
  Snackbar,
  Text,
  TextInput,
} from 'react-native-paper';

const LOCAL_USERS_KEY = 'registered_users';

const initialForm = {
  fullName: '',
  email: '',
  password: '',
  confirmPassword: '',
};

function RegisterScreen({navigation}) {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);

  const updateField = (field, value) => {
    setForm(current => ({...current, [field]: value}));
    setErrors(current => ({...current, [field]: ''}));
  };

  const validateForm = () => {
    const nextErrors = {};
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!form.fullName.trim()) {
      nextErrors.fullName = 'Full name is required.';
    }

    if (!form.email.trim()) {
      nextErrors.email = 'Email address is required.';
    } else if (!emailPattern.test(form.email.trim())) {
      nextErrors.email = 'Enter a valid email address.';
    }

    if (!form.password) {
      nextErrors.password = 'Password is required.';
    } else if (form.password.length < 6) {
      nextErrors.password = 'Password must be at least 6 characters.';
    }

    if (!form.confirmPassword) {
      nextErrors.confirmPassword = 'Confirm your password.';
    } else if (form.password !== form.confirmPassword) {
      nextErrors.confirmPassword = 'Passwords must match.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const getRegisteredUsers = async () => {
    const storedUsers = await AsyncStorage.getItem(LOCAL_USERS_KEY);
    return storedUsers ? JSON.parse(storedUsers) : [];
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    try {
      const users = await getRegisteredUsers();
      const normalizedEmail = form.email.trim().toLowerCase();
      const emailExists = users.some(user => user.email === normalizedEmail);

      if (emailExists) {
        setErrors({email: 'An account already exists for this email.'});
        return;
      }

      const nextUsers = [
        ...users,
        {
          fullName: form.fullName.trim(),
          email: normalizedEmail,
          password: form.password,
        },
      ];

      await AsyncStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(nextUsers));
      setSuccessVisible(true);
      setForm(initialForm);

      setTimeout(() => {
        navigation.replace('Login', {registeredEmail: normalizedEmail});
      }, 700);
    } catch (error) {
      setErrors({form: 'Registration failed. Please try again.'});
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        <Text variant="headlineMedium" style={styles.title}>
          Create Account
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Register your offline finance and inventory workspace.
        </Text>

        <TextInput
          label="Full name"
          value={form.fullName}
          onChangeText={value => updateField('fullName', value)}
          mode="outlined"
          style={styles.input}
          error={Boolean(errors.fullName)}
        />
        <HelperText type="error" visible={Boolean(errors.fullName)}>
          {errors.fullName}
        </HelperText>

        <TextInput
          label="Email"
          value={form.email}
          onChangeText={value => updateField('email', value)}
          mode="outlined"
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          error={Boolean(errors.email)}
        />
        <HelperText type="error" visible={Boolean(errors.email)}>
          {errors.email}
        </HelperText>

        <TextInput
          label="Password"
          value={form.password}
          onChangeText={value => updateField('password', value)}
          mode="outlined"
          style={styles.input}
          secureTextEntry
          error={Boolean(errors.password)}
        />
        <HelperText type="error" visible={Boolean(errors.password)}>
          {errors.password}
        </HelperText>

        <TextInput
          label="Confirm password"
          value={form.confirmPassword}
          onChangeText={value => updateField('confirmPassword', value)}
          mode="outlined"
          style={styles.input}
          secureTextEntry
          error={Boolean(errors.confirmPassword)}
        />
        <HelperText type="error" visible={Boolean(errors.confirmPassword)}>
          {errors.confirmPassword}
        </HelperText>

        {errors.form ? (
          <Text variant="bodySmall" style={styles.formError}>
            {errors.form}
          </Text>
        ) : null}

        <Button
          mode="contained"
          onPress={handleRegister}
          loading={isSaving}
          disabled={isSaving}
          style={styles.primaryButton}>
          Register
        </Button>

        <View style={styles.footer}>
          <Text variant="bodyMedium">Already have an account?</Text>
          <Button mode="text" onPress={() => navigation.navigate('Login')}>
            Login
          </Button>
        </View>
      </ScrollView>

      <Snackbar
        visible={successVisible}
        onDismiss={() => setSuccessVisible(false)}
        duration={700}>
        Registration successful. Opening login...
      </Snackbar>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f9fb',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    color: '#0f172a',
    fontWeight: '700',
    marginBottom: 6,
  },
  subtitle: {
    color: '#64748b',
    marginBottom: 24,
  },
  input: {
    backgroundColor: '#ffffff',
  },
  formError: {
    color: '#b42318',
    marginBottom: 12,
  },
  primaryButton: {
    marginTop: 8,
    borderRadius: 6,
  },
  footer: {
    alignItems: 'center',
    marginTop: 18,
  },
});

export default RegisterScreen;
