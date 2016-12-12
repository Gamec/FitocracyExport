var Nightmare = require('nightmare');
var args = process.argv.slice(2);

var parsePage = function(userId) {
  return function(nightmare) {
    nightmare
      .goto('https://www.fitocracy.com/activity_stream/0/?user_id=' + userId)
      .inject('js', 'jquery.js')
      .wait('.stream_item')
      .screenshot('3.png')
      .evaluate(function() {
        let setsRegex = /(^\d+(.\d+)?) kg x (\d+) reps/
        let repsRegex = /(\d+) reps/
        let workouts = [];
        let streamItems = document.getElementsByClassName('stream_item');
        for (item of streamItems) {
          let title = item.querySelector('.stream-type').textContent;
          let date = item.querySelector('.action_time').textContent;
          let exercises = [];

          $(item).find('.action_detail li').each(function() {
            let title = $(this).find('.action_prompt').text();
            if (title) {
              let sets = [];
              let skip = false;

              $(this).find('ul > li').each(function() {
                let set = setsRegex.exec($(this).text().trim());
                if (set) {
                  sets.push({
                    weight: set[1],
                    reps: set.pop(),
                    unit: 'kg'
                  });
                } else {
                  let set = repsRegex.exec($(this).text().trim());
                  if (set) {
                    sets.push({
                      reps: set[1]
                    });
                  } else {
                    // That must be cardio or some other not important exercise
                    skip = true;
                  }
                }
              });

              if (skip) { return; }

              exercises.push({
                title: title,
                sets: sets
              });
            }
          });

          workouts.push({
            title: title,
            date: date,
            exercises: exercises
          });
        }

        return workouts;
      })
  }
}

var nightmare = new Nightmare()
  .useragent("Mozilla/5.0 (Windows NT 6.3; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/38.0.2125.111 Safari/537.36")
  .cookies.clearAll()
  .goto('https://www.fitocracy.com')
  .wait('a[href="#login-modal"]')
  .screenshot('0.png')
  .click('a[href="#login-modal"]')
  .screenshot('1.png')
  .type('.login-details input[name=username]', args[0])
  .type('.login-details input[name=password]', args[1])
  .click('#login-modal-form button')
  .wait('#profile')
  .screenshot('2.png')  
  .use(parsePage(args[2]))
  .then(function(workouts) {
    for (workout of workouts) {
      console.log(workout.title);
      console.log(workout.date);
      for (exercise of workout.exercises) {
        console.log(exercise);
      }
    }
  });