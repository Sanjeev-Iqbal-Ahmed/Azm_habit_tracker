import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    withSequence,
    withDelay,
    runOnJS
} from 'react-native-reanimated';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from '@/components/themed-text';

interface SplashScreenProps {
    onFinish: () => void;
}

export function SplashScreen({ onFinish }: SplashScreenProps) {
    const { colorScheme } = useTheme();
    const isDark = colorScheme === 'dark';

    // Animation values
    const scale = useSharedValue(0.3);
    const opacity = useSharedValue(0);
    const textOpacity = useSharedValue(0);
    const containerOpacity = useSharedValue(1);

    useEffect(() => {
        // Start animations
        scale.value = withSequence(
            withTiming(1.2, { duration: 800 }),
            withSpring(1, { damping: 12 })
        );

        opacity.value = withTiming(1, { duration: 800 });

        textOpacity.value = withDelay(
            600,
            withTiming(1, { duration: 800 })
        );

        // End animations after delay
        const timeout = setTimeout(() => {
            containerOpacity.value = withTiming(0, { duration: 500 }, (finished) => {
                if (finished) {
                    runOnJS(onFinish)();
                }
            });
        }, 2500);

        return () => clearTimeout(timeout);
    }, []);

    const animatedLogoStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
    }));

    const animatedTextStyle = useAnimatedStyle(() => ({
        opacity: textOpacity.value,
    }));

    const containerStyle = useAnimatedStyle(() => ({
        opacity: containerOpacity.value,
    }));

    const bg = isDark ? '#010101' : '#F8F9FB';
    const accent = '#b6cbcaff';

    return (
        <Animated.View style={[styles.container, { backgroundColor: bg }, containerStyle]}>
            <View style={styles.content}>
                <Animated.View style={[styles.logoContainer, animatedLogoStyle]}>
                    <View style={[styles.logoCircle, { borderColor: accent }]}>
                        <View style={[styles.logoInner, { backgroundColor: accent }]} />
                    </View>
                </Animated.View>

                <Animated.View style={[styles.textContainer, animatedTextStyle]}>
                    <ThemedText style={styles.appName}>Azm</ThemedText>
                    <ThemedText style={styles.tagline}>Build better habits</ThemedText>
                </Animated.View>
            </View>
        </Animated.View>
    );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 99999,
    },
    content: {
        alignItems: 'center',
    },
    logoContainer: {
        marginBottom: 20,
    },
    logoCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 4,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 5,
    },
    logoInner: {
        width: 70,
        height: 70,
        borderRadius: 35,
    },
    textContainer: {
        alignItems: 'center',
    },
    appName: {
        fontSize: 32,
        fontWeight: 'bold',
        letterSpacing: 4,
        marginBottom: 8,
    },
    tagline: {
        fontSize: 16,
        opacity: 0.6,
        letterSpacing: 1,
    },
});
