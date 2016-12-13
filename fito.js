let Nightmare = require('nightmare');
let fs = require('fs');
let args = process.argv.slice(2);
let workouts = [];

let parsePage = function(userId, offset) {
  Promise.resolve(
    nightmare
      .goto('https://www.fitocracy.com/activity_stream/' + offset + '/?user_id=' + userId)
      .inject('js', 'jquery.js')
      .evaluate(function() {
        let workouts = [];
        let setsRegex = /(^\d+(.\d+)?) kg x (\d+) reps/
        let repsRegex = /(\d+) reps/
        let titleRegex = /tracked (.*?) for/
        let streamItems = document.getElementsByClassName('stream_item');
        for (item of streamItems) {
          let title = titleRegex.exec(item.querySelector('.stream-type').textContent);
          if (title) {
            title = title[1];
          } else {
            continue;
          }

          let date = item.querySelector('.action_time').textContent;
          let exercises = [];

          $(item).find('.action_detail li').each(function() {
            let title = $(this).find('.action_prompt').text();
            let note = null;

            if (title) {
              let sets = [];
              let skip = false;

              $(this).find('ul > li').each(function() {
                if ($(this).hasClass('stream_note')) {
                  note = $(this).text().trim();
                  return;
                }

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
                    sets.push('ERR' + $(this).text().trim());
                    //skip = true;
                  }
                }
              });

              if (skip) { return; }

              exercises.push({
                title: title,
                sets: sets,
                note: note
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
  ).then(function(results) {
    if (results.length > 0) {
      workouts.push(results);
      parsePage(userId, offset + 15);
    } else {
      nightmare.proc.disconnect();
      nightmare.proc.kill();
      nightmare.ended = true;

      fs.writeFile('export.json', JSON.stringify(workouts), (err) => {
        if(err) {
          return console.log(err);
        }
        console.log('Export completed');
      }); 
    }
  });
}

let nightmare = new Nightmare({show: true})
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
  .screenshot('2.png');

parsePage(args[2], 0);

