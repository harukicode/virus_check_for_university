Raport Projektu – SecureScanner 

 

Illia Buleikha, Illia Yakovunyk 

Aplikacja webowa do skanowania plików pod kątem malware 

 

1. Opis Projektu 

SecureScanner to aplikacja webowa przeznaczona do skanowania plików pod kątem zagrożeń cyberbezpieczeństwa. Aplikacja wykorzystuje API VirusTotal do przeprowadzania kompleksowych analiz plików za pomocą ponad 60 silników antywirusowych. 

Główne Funkcjonalności 

    Przesyłanie plików - obsługa drag & drop, pliki do 32MB 

    Skanowanie w czasie rzeczywistym - monitoring postępu z wizualnym feedbackiem 

    Historia skanów - lokalne przechowywanie wyników z możliwością filtrowania 

    Dashboard statystyk - przegląd bezpiecznych plików vs wykrytych zagrożeń 

    Eksport danych - możliwość zapisania historii w formacie JSON 

 

2. Architektura Techniczna 

Frontend (React + TypeScript) 

Aplikacja kliencka zbudowana w oparciu o React 19 z TypeScript, zapewniająca nowoczesny i responsywny interfejs użytkownika. Wykorzystuje bibliotekę shadcn/ui dla komponentów oraz Tailwind CSS do stylowania. 

Backend (Flask + Python) 

Serwer API napisany w Flask obsługuje komunikację z VirusTotal API, zarządzanie rate limiting oraz walidację przesyłanych plików. Implementuje mechanizmy bezpieczeństwa i obsługę błędów. 

Integracja Zewnętrzna 

Główną integracją jest VirusTotal API v3, które umożliwia skanowanie plików przez dziesiątki silników antywirusowych i otrzymywanie szczegółowych raportów o wykrytych zagrożeniach. 

 

3. Użyte Technologie 

Frontend 

    React 19.1.0 - framework UI 

    TypeScript - statyczne typowanie JavaScript 

    Vite - nowoczesny bundler i development server 

    Tailwind CSS 4.1.8 - utility-first CSS framework 

    Axios - biblioteka do komunikacji HTTP 

    React Dropzone - obsługa przesyłania plików 

Backend 

    Flask 2.3.3 - mikro-framework webowy dla Python 

    Flask-CORS - obsługa Cross-Origin Resource Sharing 

    Requests - biblioteka HTTP dla Python 

    Python-dotenv - zarządzanie zmiennymi środowiskowymi 

 

4. Kluczowe Funkcjonalności 

Przesyłanie i Skanowanie Plików 

Aplikacja oferuje intuicyjny interfejs do przesyłania plików poprzez przeciągnięcie i upuszczenie lub tradycyjny wybór pliku. System automatycznie waliduje rozmiar i typ pliku przed przesłaniem do analizy. 

Monitoring Postępu 

Podczas skanowania użytkownik otrzymuje informacje w czasie rzeczywistym o postępie analizy, aktualnie używanym silniku antywirusowym oraz liczbie ukończonych skanów. 

Zarządzanie Historią 

Wszystkie wyniki skanów są automatycznie zapisywane w lokalnej pamięci przeglądarki. Użytkownicy mogą przeglądać historię, filtrować wyniki według statusu bezpieczeństwa oraz eksportować dane. 

System Statystyk 

Dashboard przedstawia kompleksowe statystyki including całkowitą liczbę skanów, liczbę bezpiecznych plików, wykrytych zagrożeń oraz średni czas skanowania. 

 

5. Bezpieczeństwo i Ograniczenia 

Rate Limiting 

Aplikacja implementuje mechanizm ograniczający częstotliwość żądań do 15 sekund między kolejnymi skanami, zgodnie z limitami darmowego konta VirusTotal. 

Walidacja Danych 

System sprawdza rozmiar plików (maksymalnie 32MB), typ MIME oraz implementuje kompleksową obsługę błędów dla różnych scenariuszy niepowodzeń. 

Prywatność 

Wszystkie dane historii skanów są przechowywane lokalnie w przeglądarce użytkownika, zapewniając prywatność i kontrolę nad własnymi danymi. 

 

6. Interfejs Użytkownika 

Design i Responsywność 

Aplikacja oferuje nowoczesny, minimalistyczny design z pełną responsywnością na urządzeniach mobilnych i desktopowych. Interface wykorzystuje animacje i wizualny feedback dla lepszego user experience. 

Nawigacja 

Główne menu umożliwia przełączanie między sekcją skanowania a dashboardem statystyk. Każda sekcja jest zoptymalizowana pod konkretne zadania użytkownika. 

Obsługa Błędów 

System przedstawia czytelne komunikaty błędów z sugestiami rozwiązań, helping użytkownikom zrozumieć i rozwiązać potencjalne problemy. 

 

7. Workflow Aplikacji 

Proces skanowania przebiega następująco: użytkownik wybiera plik, który jest walidowany i przesyłany do backend. Serwer przekazuje plik do VirusTotal API i rozpoczyna polling wyników co 2 sekundy. Po otrzymaniu rezultatów, dane są prezentowane użytkownikowi i automatycznie zapisywane w historii. 

 

8. Instalacja i Konfiguracja 

Wymagania Systemowe 

    Node.js w wersji 18 lub nowszej 

    Python 3.8 lub nowszy 

    Klucz API VirusTotal (darmowe konto) 

Uruchomienie Aplikacji 

Frontend uruchamiany jest standardowo przez npm w trybie development na porcie 5173. Backend wymaga instalacji zależności Python oraz konfiguracji klucza API w pliku .env, po czym uruchamiany jest na porcie 5000. 

 

9. Możliwości Rozwoju 

Planowane Ulepszenia 

W przyszłości aplikacja może zostać rozszerzona o system autentykacji użytkowników, integrację z bazą danych dla trwałego przechowywania historii, implementację kolejki zadań dla większych plików oraz dodatkowe źródła skanowania antywirusowego. 

Optymalizacje Techniczne 

Potencjalne ulepszenia obejmują implementację caching wyników, kompresję przesyłanych plików, WebSockets dla real-time updates oraz service workers dla funkcjonalności offline. 

 

10. Podsumowanie 

SecureScanner stanowi kompleksowe rozwiązanie demonstrujące nowoczesne podejście do tworzenia aplikacji webowych z naciskiem na cyberbezpieczeństwo. Projekt łączy intuicyjny interfejs użytkownika z solidną architekturą backend, oferując użytkownikom niezawodne narzędzie do analizy plików. 

Kluczowe Osiągnięcia 

Pełna integracja z VirusTotal API (60+ silników antywirusowych) 

 Responsywny interfejs z React i TypeScript 

 Lokalne zarządzanie historią skanów 

 Implementacja rate limiting i comprehensive error handling 

 Modularna architektura gotowa na dalszy rozwój 

 
