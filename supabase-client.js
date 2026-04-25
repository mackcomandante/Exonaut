(function () {
  const SUPABASE_URL  = 'https://vkiikgsxhymnymacwygr.supabase.co';
  const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZraWlrZ3N4aHltbnltYWN3eWdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwODc1NTIsImV4cCI6MjA5MjY2MzU1Mn0.UpDKmY7Dj5fbDBWc21rV9puoIVmdnvv9IH3l0wVJT7s';
  window.__db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
})();
