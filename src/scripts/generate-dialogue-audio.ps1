Add-Type -AssemblyName System.Speech

$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.Rate = 0 # Normal speaking rate for IELTS
$synth.Volume = 100

$outputPath = "D:\Fluenty\client\public\audio\library_orientation.wav"
if (Test-Path $outputPath) {
    Remove-Item $outputPath -Force
}

$synth.SetOutputToWaveFile($outputPath)

$builder = New-Object System.Speech.Synthesis.PromptBuilder

# Intro chime / announcement
$builder.StartVoice("Microsoft David Desktop")
$builder.AppendText("IELTS Listening Practice Test. Section 1. You will hear an orientation conversation between a university librarian and an international student. First, you have some time to look at questions 1 to 3.")
$builder.EndVoice()
$builder.AppendBreak([TimeSpan]::FromSeconds(2.5))

# Librarian (Zira - Female)
$builder.StartVoice("Microsoft Zira Desktop")
$builder.AppendText("Good morning, welcome to Central University Library. How may I assist you today?")
$builder.EndVoice()
$builder.AppendBreak([TimeSpan]::FromSeconds(1.0))

# Student (David - Male)
$builder.StartVoice("Microsoft David Desktop")
$builder.AppendText("Hello! I am an international post-graduate student, and I would like to register for my library borrowing privileges.")
$builder.EndVoice()
$builder.AppendBreak([TimeSpan]::FromSeconds(1.0))

# Librarian (Zira - Female)
$builder.StartVoice("Microsoft Zira Desktop")
$builder.AppendText("Wonderful. You will need your student identification card and proof of local address in the city. Under our borrowing policy, masters students are permitted to check out up to twelve books simultaneously for a duration of three weeks.")
$builder.EndVoice()
$builder.AppendBreak([TimeSpan]::FromSeconds(1.2))

# Student (David - Male)
$builder.StartVoice("Microsoft David Desktop")
$builder.AppendText("Is there any penalty if I return a book overdue?")
$builder.EndVoice()
$builder.AppendBreak([TimeSpan]::FromSeconds(1.0))

# Librarian (Zira - Female)
$builder.StartVoice("Microsoft Zira Desktop")
$builder.AppendText("Yes, standard loans incur a fine of fifty pence per day, whereas reserve books kept overnight carry a penalty of two pounds per hour.")
$builder.EndVoice()
$builder.AppendBreak([TimeSpan]::FromSeconds(1.0))

# Student (David - Male)
$builder.StartVoice("Microsoft David Desktop")
$builder.AppendText("And what time does the reference section close on weekdays?")
$builder.EndVoice()
$builder.AppendBreak([TimeSpan]::FromSeconds(0.8))

# Librarian (Zira - Female)
$builder.StartVoice("Microsoft Zira Desktop")
$builder.AppendText("The reference wing is accessible until nine thirty PM from Monday through Thursday, and until eight PM on Fridays.")
$builder.EndVoice()
$builder.AppendBreak([TimeSpan]::FromSeconds(1.5))

# Outro
$builder.StartVoice("Microsoft David Desktop")
$builder.AppendText("That is the end of Section 1. You now have half a minute to check your answers.")
$builder.EndVoice()

$synth.Speak($builder)
$synth.Dispose()

Write-Host "Generated audio successfully at $outputPath"
