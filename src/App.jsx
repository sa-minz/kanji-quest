import { useEffect, useState } from "react";
import "./App.css";

const API_URL = "https://kanjiapi.dev/v1";
const QUESTIONS_PER_GAME = 10;

const levels = [
  { value: "5", label: "JLPT N5" },
  { value: "4", label: "JLPT N4" },
  { value: "3", label: "JLPT N3" },
];

function shuffle(array) {
  return [...array].sort(() => Math.random() - 0.5);
}

function App() {
  const [level, setLevel] = useState("5");

  const [kanjiList, setKanjiList] = useState([]);
  const [questions, setQuestions] = useState([]);

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);

  const [bestScore, setBestScore] = useState(
    Number(localStorage.getItem("kanjiQuestBestScore")) || 0
  );

  const [selectedAnswer, setSelectedAnswer] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gameFinished, setGameFinished] = useState(false);

  useEffect(() => {
    loadKanji(level);
  }, [level]);

  async function loadKanji(selectedLevel) {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${API_URL}/kanji/jlpt-${selectedLevel}`
      );

      if (!response.ok) {
        throw new Error("Could not load Kanji.");
      }

      const data = await response.json();

      setKanjiList(data);

      await generateGame(data);
    } catch (error) {
      console.error(error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function generateGame(list) {
    try {
      const shuffledKanji = shuffle(list);

      const selectedKanji = shuffledKanji.slice(
        0,
        QUESTIONS_PER_GAME
      );

      const questionData = await Promise.all(
        selectedKanji.map(async (character) => {
          const response = await fetch(
            `${API_URL}/kanji/${encodeURIComponent(character)}`
          );

          if (!response.ok) {
            throw new Error(
              `Could not load Kanji: ${character}`
            );
          }

          const data = await response.json();

          return {
            kanji: character,
            meaning:
              data.meanings?.[0] || "Unknown",
            reading:
              data.kun_readings?.[0] ||
              data.on_readings?.[0] ||
              "",
          };
        })
      );

      const finalQuestions = questionData.map(
        (question) => {
          const otherQuestions = questionData.filter(
            (item) =>
              item.kanji !== question.kanji
          );

          const wrongAnswers = shuffle(
            otherQuestions
          )
            .slice(0, 3)
            .map((item) => item.meaning);

          const options = shuffle([
            question.meaning,
            ...wrongAnswers,
          ]);

          return {
            ...question,
            options,
          };
        }
      );

      setQuestions(finalQuestions);
    } catch (error) {
      console.error(error);
      setError(error.message);
    }
  }

  function handleAnswer(answer) {
    if (selectedAnswer !== null) {
      return;
    }

    const question =
      questions[currentQuestion];

    setSelectedAnswer(answer);

    if (answer === question.meaning) {
      const newScore = score + 1;

      setScore(newScore);

      setStreak(
        (previous) => previous + 1
      );

      if (newScore > bestScore) {
        setBestScore(newScore);

        localStorage.setItem(
          "kanjiQuestBestScore",
          newScore
        );
      }
    } else {
      setStreak(0);
    }

    setTimeout(() => {
      if (
        currentQuestion + 1 <
        questions.length
      ) {
        setCurrentQuestion(
          (previous) => previous + 1
        );

        setSelectedAnswer(null);
      } else {
        setGameFinished(true);
      }
    }, 800);
  }

  function speakReading() {
    const question =
      questions[currentQuestion];

    if (!question?.reading) {
      return;
    }

    const speech =
      new SpeechSynthesisUtterance(
        question.reading
      );

    speech.lang = "ja-JP";
    speech.rate = 0.8;

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(speech);
  }

  function changeLevel(newLevel) {
    setLevel(newLevel);

    setCurrentQuestion(0);
    setScore(0);
    setStreak(0);
    setSelectedAnswer(null);
    setGameFinished(false);
  }

  async function restartGame() {
    setLoading(true);

    setCurrentQuestion(0);
    setScore(0);
    setStreak(0);
    setSelectedAnswer(null);
    setGameFinished(false);

    await generateGame(kanjiList);

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="app">
        <div className="game-card result-card">
          <div className="logo">🎌</div>

          <h1>Kanji Quest</h1>

          <div className="final-kanji">
            漢字
          </div>

          <p>
            Loading Kanji... 🌸
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app">
        <div className="game-card result-card">
          <div className="logo">⚠️</div>

          <h1>
            Unable to Load Kanji
          </h1>

          <p className="result-message">
            {error}
          </p>

          <button
            className="restart-button"
            onClick={() =>
              window.location.reload()
            }
          >
            🔄 Try Again
          </button>
        </div>
      </div>
    );
  }

  if (gameFinished) {
    return (
      <div className="app">
        <div className="game-card result-card">
          <div className="logo">🎌</div>

          <h1>
            Game Complete! ✨
          </h1>

          <div className="final-kanji">
            漢字
          </div>

          <h2>
            {
              levels.find(
                (item) =>
                  item.value === level
              )?.label
            }
          </h2>

          <h2>Your Score</h2>

          <div className="final-score">
            {score} / {questions.length}
          </div>

          <p className="result-message">
            {score === questions.length
              ? "Perfect! 素晴らしい！ 🎉"
              : score >= 7
              ? "Great job! よくできました！ 👏"
              : score >= 5
              ? "Good effort! がんばって！ 💪"
              : "Keep practicing! 📚"}
          </p>

          <div className="result-details">
            🏆 Best Score: {bestScore}
          </div>

          <button
            className="restart-button"
            onClick={restartGame}
          >
            🔄 New Game
          </button>
        </div>
      </div>
    );
  }

  const question =
    questions[currentQuestion];

  return (
    <div className="app">
      <div className="game-card">

        {/* HEADER */}
        <div className="header">
          <div>
            <div className="logo">
              🌸 Kanji Quest 🌸
            </div>

            <p>
              Japanese Kanji Learning Game ✨
            </p>
          </div>

          <div className="score-box">
            ⭐ {score}
          </div>
        </div>

        {/* BEST SCORE */}
        <div className="best-score">
          🏆 Best: {bestScore}
        </div>

        {/* JLPT LEVEL */}
        <div className="level-selector">
          <label htmlFor="level">
            Select JLPT Level
          </label>

          <select
            id="level"
            value={level}
            onChange={(event) =>
              changeLevel(
                event.target.value
              )
            }
          >
            {levels.map((item) => (
              <option
                key={item.value}
                value={item.value}
              >
                {item.label}
              </option>
            ))}
          </select>
        </div>

        {/* PROGRESS */}
        <div className="progress-section">
          <div className="progress-text">
            Question{" "}
            {currentQuestion + 1} /{" "}
            {questions.length}
          </div>

          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${
                  ((currentQuestion + 1) /
                    questions.length) *
                  100
                }%`,
              }}
            />
          </div>
        </div>

        {/* STREAK */}
        <div
          className={`streak-box ${
            streak > 0
              ? "streak-active"
              : ""
          }`}
        >
          <span className="streak-label">
            Streak
          </span>

          <span
            className="streak-value"
            key={streak}
          >
            🔥 {streak}
          </span>

          {streak >= 3 && (
            <div
              key={`message-${streak}`}
              className="streak-pop"
            >
              {streak >= 10
                ? "🌟 AMAZING!"
                : streak >= 5
                ? "✨ Great streak!"
                : "💖 Nice!"}
            </div>
          )}
        </div>

        {/* QUESTION */}
        <div className="question-section">
          <p className="question-label">
            What does this Kanji mean?
          </p>

          <div className="kanji">
            {question.kanji}
          </div>

          <p className="hint">
            Reading:{" "}
            {question.reading || "—"}
          </p>

          {/* PRONUNCIATION */}
          <button
            className="speak-button"
            onClick={speakReading}
          >
            🔊 Listen
          </button>

          <p className="hint">
            Choose the correct meaning
          </p>
        </div>

        {/* ANSWERS */}
        <div className="answers">
          {question.options.map(
            (option) => {
              let buttonClass =
                "answer-button";

              if (
                selectedAnswer !== null
              ) {
                if (
                  option ===
                  question.meaning
                ) {
                  buttonClass +=
                    " correct";
                } else if (
                  option ===
                  selectedAnswer
                ) {
                  buttonClass +=
                    " wrong";
                }
              }

              return (
                <button
                  key={option}
                  className={
                    buttonClass
                  }
                  onClick={() =>
                    handleAnswer(
                      option
                    )
                  }
                >
                  {option}
                </button>
              );
            }
          )}
        </div>

        {/* FOOTER */}
        <div className="footer">
          <span>
            📚 JLPT N{level}
          </span>

          <span>
            🔥 Streak: {streak}
          </span>
        </div>

      </div>
    </div>
  );
}

export default App;