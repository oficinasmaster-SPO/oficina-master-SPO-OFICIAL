export default class ScoreCalculator {
  static calculate(answers) {
    if (!answers || answers.length === 0) {
      return {
        technical_score: 0,
        behavioral_score: 0,
        cultural_score: 0,
        final_score: 0
      };
    }

    const technical = answers.filter(a => a.question_text?.includes('técnica') || a.category === 'tecnica');
    const behavioral = answers.filter(a => a.question_text?.includes('comportamental') || a.category === 'comportamental');
    const cultural = answers.filter(a => a.question_text?.includes('cultural') || a.category === 'cultural');

    const avgTechnical = technical.length > 0 
      ? technical.reduce((sum, a) => sum + (a.score || 0), 0) / technical.length 
      : 0;
    
    const avgBehavioral = behavioral.length > 0 
      ? behavioral.reduce((sum, a) => sum + (a.score || 0), 0) / behavioral.length 
      : 0;
    
    const avgCultural = cultural.length > 0 
      ? cultural.reduce((sum, a) => sum + (a.score || 0), 0) / cultural.length 
      : 0;

    const finalScore = ((avgTechnical + avgBehavioral + avgCultural) / 3) * 10;

    return {
      technical_score: Math.round(avgTechnical * 10),
      behavioral_score: Math.round(avgBehavioral * 10),
      cultural_score: Math.round(avgCultural * 10),
      final_score: Math.round(finalScore)
    };
  }
}