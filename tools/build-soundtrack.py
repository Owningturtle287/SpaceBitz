from pathlib import Path
import numpy as np
from scipy import signal
from scipy.io import wavfile

SR=44100
PHRASE=[60,64,67,64,62,67,59,67,57,60,64,60,57,60,65,60]
NOTE_SECONDS=0.60/0.90
NOTE_LEN=int(round(SR*NOTE_SECONDS))
REPEATS=6
TOTAL_NOTES=len(PHRASE)*REPEATS
TAIL_SECONDS=2.0
song=np.zeros(TOTAL_NOTES*NOTE_LEN+int(TAIL_SECONDS*SR),dtype=np.float64)

for i in range(TOTAL_NOTES):
    midi=PHRASE[i%len(PHRASE)]
    freq=440.0*2**((midi-69)/12.0)
    start=i*NOTE_LEN
    n=NOTE_LEN
    t=np.arange(n)/SR
    env=np.zeros(n)
    attack=int(0.030*SR); sustain_start=int(0.11*SR); release_start=int(0.50*SR)
    env[:attack]=np.sin(np.linspace(0,np.pi/2,attack,endpoint=False))**2
    env[attack:sustain_start]=np.linspace(1.0,0.82,sustain_start-attack,endpoint=False)
    env[sustain_start:release_start]=np.exp(np.linspace(np.log(0.82),np.log(0.52),release_start-sustain_start,endpoint=False))
    env[release_start:]=np.exp(np.linspace(np.log(0.52),np.log(0.015),n-release_start))
    detune=2**(2.8/1200.0)
    core=.44*np.sin(2*np.pi*(freq/detune)*t)+.44*np.sin(2*np.pi*(freq*detune)*t+.02)
    h2=.10*np.sin(2*np.pi*(freq*2.0)*t+.03)
    h3=.028*np.sin(2*np.pi*(freq*3.0)*t-.02)
    shimmer=.022*np.sin(2*np.pi*(freq*2.0)*t+.15)*np.exp(-3.0*t)
    pluck=.050*np.sin(2*np.pi*(freq*1.002)*t)*np.exp(-9.0*t)
    note=(core+h2+h3)*env+shimmer*env+pluck
    note*=1.0+.015*np.sin(2*np.pi*.45*t+i*.37)
    note=signal.sosfiltfilt(signal.butter(2,75,btype='highpass',fs=SR,output='sos'),note)
    note=signal.sosfiltfilt(signal.butter(4,4300,btype='lowpass',fs=SR,output='sos'),note)
    edge=min(n//2,int(.005*SR)); fade=np.sin(np.linspace(0,np.pi/2,edge))**2
    note[:edge]*=fade; note[-edge:]*=fade[::-1]
    song[start:start+n]+=note

dry=song.copy(); amb=np.zeros_like(song)
for delay_s,gain in [(.11,.060),(.19,.043),(.31,.030),(.47,.020),(.68,.013),(.93,.008)]:
    d=int(delay_s*SR); amb[d:]+=dry[:-d]*gain
amb=signal.sosfiltfilt(signal.butter(3,3200,btype='lowpass',fs=SR,output='sos'),amb)
song=dry+amb
song=signal.sosfiltfilt(signal.butter(2,70,btype='highpass',fs=SR,output='sos'),song)
song=signal.sosfiltfilt(signal.butter(4,4700,btype='lowpass',fs=SR,output='sos'),song)
song=np.tanh(song*.78)/np.tanh(.78)
peak=np.max(np.abs(song)); target=10**(-1.5/20.0)
if peak>0: song*=target/peak

# The native loop restarts at this 2-second silent lead-in, producing both the
# startup delay and the gap before the next repeat with no JS playback timer.
silence=np.zeros(int(2.0*SR),dtype=np.float64)
full=np.concatenate([silence,song])
pcm=(np.clip(full,-1,1)*32767).astype(np.int16)
out=Path('audio/nostalgic_melody_soft_synth.wav')
out.parent.mkdir(parents=True,exist_ok=True)
wavfile.write(out,SR,pcm)
print(f'Built {out}: {len(full)/SR:.3f}s')
