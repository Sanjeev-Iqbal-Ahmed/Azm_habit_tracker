import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { View as RouterView, StyleSheet as RouterStyleSheet, TouchableOpacity as RouterTouchableOpacity, Dimensions as RouterDimensions, Modal as RouterModal, TextInput as RouterTextInput, KeyboardAvoidingView as RouterKeyboardAvoidingView, Platform as RouterPlatform } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';

const { width } = Dimensions.get('window');
const CIRCLE_SIZE = width * 0.7;
const STROKE_WIDTH = 15;
const RADIUS = (CIRCLE_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

type Mode = 'timer' | 'stopwatch';

export default function PomodoroScreen() {
    const [mode, setMode] = useState<Mode>('timer');
    
    // Separate states for timer
    const [timerRunning, setTimerRunning] = useState(false);
    const [timeLeft, setTimeLeft] = useState(25 * 60);
    const timerEndTimeRef = useRef<number | null>(null);
    const timerPausedTimeRef = useRef<number | null>(null);
    
    // Separate states for stopwatch
    const [stopwatchRunning, setStopwatchRunning] = useState(false);
    const [stopwatchTime, setStopwatchTime] = useState(0);
    const stopwatchStartTimeRef = useRef<number | null>(null);
    const stopwatchPausedTimeRef = useRef<number | null>(null);
    
    const [isTimeModalVisible, setIsTimeModalVisible] = useState(false);
    const [customTimeInput, setCustomTimeInput] = useState('25');

    const intervalRef = useRef<any>(null);

    const backgroundColor = useThemeColor({}, 'background');
    const primaryColor = useThemeColor({}, 'text');
    const accentColor = useThemeColor({}, 'accent');
    const accentTextColor = useThemeColor({}, 'accentText');
    const mutedColor = useThemeColor({}, 'muted');
    const surfaceColor = useThemeColor({}, 'surface');
    const borderColor = useThemeColor({}, 'border');

    // Current mode's running state
    const isRunning = mode === 'timer' ? timerRunning : stopwatchRunning;

    // Load timer state on focus (simulating keeping it alive)
    useFocusEffect(
        React.useCallback(() => {
            // Timer sync
            if (timerRunning && timerEndTimeRef.current) {
                const now = Date.now();
                const remaining = Math.max(0, Math.ceil((timerEndTimeRef.current - now) / 1000));
                setTimeLeft(remaining);
                if (remaining <= 0) {
                    handleTimerComplete();
                }
            }
            
            // Stopwatch sync
            if (stopwatchRunning && stopwatchStartTimeRef.current) {
                const now = Date.now();
                const elapsed = Math.floor((now - stopwatchStartTimeRef.current) / 1000);
                setStopwatchTime(elapsed);
            }
        }, [timerRunning, stopwatchRunning])
    );

    useEffect(() => {
        if (timerRunning || stopwatchRunning) {
            intervalRef.current = setInterval(() => {
                // Update timer if running
                if (timerRunning && timerEndTimeRef.current) {
                    const now = Date.now();
                    const remaining = Math.max(0, Math.ceil((timerEndTimeRef.current - now) / 1000));
                    setTimeLeft(remaining);
                    if (remaining <= 0) {
                        handleTimerComplete();
                    }
                }
                
                // Update stopwatch if running
                if (stopwatchRunning && stopwatchStartTimeRef.current) {
                    const now = Date.now();
                    const elapsed = Math.floor((now - stopwatchStartTimeRef.current) / 1000);
                    setStopwatchTime(elapsed);
                }
            }, 100);
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        }

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [timerRunning, stopwatchRunning]);

    const handleTimerComplete = () => {
        setTimerRunning(false);
        setTimeLeft(0);
        timerEndTimeRef.current = null;
    };

    const toggleTimer = () => {
        if (mode === 'timer') {
            if (timerRunning) {
                // Pause timer
                setTimerRunning(false);
                timerPausedTimeRef.current = Date.now();
            } else {
                // Start/resume timer
                const now = Date.now();
                const targetSeconds = timeLeft;
                timerEndTimeRef.current = now + targetSeconds * 1000;
                setTimerRunning(true);
                timerPausedTimeRef.current = null;
            }
        } else {
            if (stopwatchRunning) {
                // Pause stopwatch
                setStopwatchRunning(false);
                stopwatchPausedTimeRef.current = Date.now();
            } else {
                // Start/resume stopwatch
                const now = Date.now();
                if (stopwatchTime > 0 && stopwatchPausedTimeRef.current && stopwatchStartTimeRef.current) {
                    // Adjust start time by adding the paused duration
                    const pausedDuration = now - stopwatchPausedTimeRef.current;
                    stopwatchStartTimeRef.current += pausedDuration;
                } else {
                    stopwatchStartTimeRef.current = now;
                }
                setStopwatchRunning(true);
                stopwatchPausedTimeRef.current = null;
            }
        }
    };

    const resetTimer = () => {
        if (mode === 'timer') {
            setTimerRunning(false);
            setTimeLeft(25 * 60);
            timerEndTimeRef.current = null;
            timerPausedTimeRef.current = null;
        } else {
            setStopwatchRunning(false);
            setStopwatchTime(0);
            stopwatchStartTimeRef.current = null;
            stopwatchPausedTimeRef.current = null;
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const progress = mode === 'timer' ? Math.min(1, timeLeft / (25 * 60)) : 1;
    const strokeDashoffset = CIRCUMFERENCE * (1 - progress);

    const handleTimePress = () => {
        if (mode === 'timer' && !timerRunning) {
            setCustomTimeInput(Math.floor(timeLeft / 60).toString());
            setIsTimeModalVisible(true);
        }
    };

    const handleSaveTime = () => {
        const minutes = parseInt(customTimeInput, 10);
        if (!isNaN(minutes) && minutes > 0) {
            setTimeLeft(minutes * 60);
            setIsTimeModalVisible(false);
        } else {
            setIsTimeModalVisible(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor }]}>
            <View style={styles.header}>
                <View style={styles.segmentedControl}>
                    <TouchableOpacity
                        style={[styles.segment, mode === 'timer' && { backgroundColor: accentColor }]}
                        onPress={() => setMode('timer')}
                    >
                        <ThemedText style={{ color: mode === 'timer' ? accentTextColor : primaryColor, fontWeight: '600' }}>Timer</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.segment, mode === 'stopwatch' && { backgroundColor: accentColor }]}
                        onPress={() => setMode('stopwatch')}
                    >
                        <ThemedText style={{ color: mode === 'stopwatch' ? accentTextColor : primaryColor, fontWeight: '600' }}>Stopwatch</ThemedText>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.content}>
                <View style={styles.timerContainer}>
                    <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE} style={styles.svg}>
                        {/* Background Circle */}
                        <Circle
                            fill={borderColor}         
                            stroke={borderColor}
                            cx={CIRCLE_SIZE / 2}
                            cy={CIRCLE_SIZE / 2}
                            r={RADIUS}
                            strokeWidth={STROKE_WIDTH}
                        />

                        {/* Progress Circle (Only for Timer) */}
                        {mode === 'timer' && (
                            <Circle
                                fill={borderColor}  
                                stroke={accentColor}
                                cx={CIRCLE_SIZE / 2}
                                cy={CIRCLE_SIZE / 2}
                                r={RADIUS}
                                strokeWidth={STROKE_WIDTH}
                                strokeDasharray={CIRCUMFERENCE}
                                strokeDashoffset={strokeDashoffset}
                                strokeLinecap="round"
                                rotation="-270"
                                origin={`${CIRCLE_SIZE / 2}, ${CIRCLE_SIZE / 2}`}
                                scaleX={-1}
                            />
                        )}
                    </Svg>

                    <View style={styles.timeDisplay}>
                        <TouchableOpacity onPress={handleTimePress} disabled={mode !== 'timer' || timerRunning}>
                            <ThemedText style={[styles.timeText, { color: primaryColor }]}>
                                {mode === 'timer' ? formatTime(timeLeft) : formatTime(stopwatchTime)}
                            </ThemedText>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.controls}>
                    <TouchableOpacity
                        style={[styles.controlButton, { backgroundColor: borderColor }]}
                        onPress={resetTimer}
                    >
                        <Ionicons name="refresh" size={24} color={primaryColor} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.mainButton, { backgroundColor: accentColor }]}
                        onPress={toggleTimer}
                    >
                        <Ionicons
                            name={isRunning ? "pause" : "play"}
                            size={40}
                            color={accentTextColor}
                            style={{ marginLeft: isRunning ? 0 : 4 }}
                        />
                    </TouchableOpacity>

                    {/* Placeholder for symmetry */}
                    <View style={{ width: 56 }} />
                </View>

                {/* Set Timer Button - Only visible in timer mode */}
                {mode === 'timer' && (
                    <TouchableOpacity
                        style={[styles.setTimerButton, { backgroundColor: borderColor }]}
                        onPress={() => {
                            setCustomTimeInput(Math.floor(timeLeft / 60).toString());
                            setIsTimeModalVisible(true);
                        }}
                        disabled={timerRunning}
                    >
                        <Ionicons name="time-outline" size={20} color={timerRunning ? mutedColor : primaryColor} />
                        <ThemedText style={[styles.setTimerText, { color: timerRunning ? mutedColor : primaryColor }]}>
                            Set Timer
                        </ThemedText>
                    </TouchableOpacity>
                )}
            </View>

            {/* Custom Time Modal */}
            <Modal
                visible={isTimeModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsTimeModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View style={[styles.modalContent, { backgroundColor: surfaceColor }]}>
                        <ThemedText style={styles.modalTitle}>Set Timer (minutes)</ThemedText>
                        <TextInput
                            style={[styles.modalInput, { color: primaryColor, borderColor: accentColor }]}
                            value={customTimeInput}
                            onChangeText={setCustomTimeInput}
                            keyboardType="number-pad"
                            autoFocus
                            selectTextOnFocus
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={[styles.modalButton, { borderColor: mutedColor, borderWidth: 1 }]}
                                onPress={() => setIsTimeModalVisible(false)}
                            >
                                <ThemedText style={{ color: mutedColor }}>Cancel</ThemedText>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, { backgroundColor: accentColor }]}
                                onPress={handleSaveTime}
                            >
                                <ThemedText style={{ color: accentTextColor, fontWeight: '600' }}>Set</ThemedText>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 60,
        paddingHorizontal: 20,
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    segmentedControl: {
        flexDirection: 'row',
        backgroundColor: 'rgba(150, 150, 150, 0.1)',
        borderRadius: 20,
        padding: 4,
        width: '70%',
    },
    segment: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 16,
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: 100,
    },
    timerContainer: {
        width: CIRCLE_SIZE,
        height: CIRCLE_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 60,
    },
    svg: {
        position: 'absolute',
    },
    timeDisplay: {
        alignItems: 'center',
    },
    timeText: {
        fontSize: 44,
        fontWeight: '700',
        fontVariant: ['tabular-nums'],
        lineHeight: 44,
    },
    controls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 40,
        marginBottom: 40,
    },
    mainButton: {
        width: 88,
        height: 88,
        borderRadius: 44,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 6,
    },
    controlButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    setTimerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 20,
        gap: 8,
    },
    setTimerText: {
        fontSize: 16,
        fontWeight: '600',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: '80%',
        maxWidth: 300,
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
    },
    modalInput: {
        width: '100%',
        fontSize: 32,
        fontWeight: '700',
        textAlign: 'center',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 24,
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    modalButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
});