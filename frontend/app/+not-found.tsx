import { Link, Stack } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../constants/theme';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={styles.container}>
        <Text style={styles.title}>Page Not Found</Text>
        <Text style={styles.subtitle}>This screen doesn't exist.</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Go back to trading →</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex:            1,
    backgroundColor: theme.colors.background,
    alignItems:      'center',
    justifyContent:  'center',
    gap:             12,
    padding:         24,
  },
  title: {
    color:      theme.colors.text,
    fontSize:   24,
    fontWeight: theme.font.bold,
  },
  subtitle: {
    color:    theme.colors.textSecondary,
    fontSize: 15,
  },
  link: {
    marginTop: 12,
  },
  linkText: {
    color:      theme.colors.green,
    fontSize:   15,
    fontWeight: theme.font.semibold,
  },
});