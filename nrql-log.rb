# format logs retrieved from nrdb
# usage: curl ... | ruby dev/nrdb-log.rb


# if [ $# -eq 0 ]
#   then
#     export NRQL="SELECT latest(log), latest(timestamp), latest(exitStatus), latest(elapsed) from eldoradoTask where exitStatus > 0 facet task since 1 month ago limit 50"
#   else
#     export NRQL="SELECT * from eldoradoTask where task='$TASK' since 1 $PERIOD ago limit 1000"
# fi


require 'json'

# {
#   "results": [
#     {
#       "events": [
#         {
#           "elapsed": 33.148628589,
#           "environment": "datanerd",
#           "exitStatus": 4,
#           "log": "================= extracts/harbourmaster/extract.sh =================<br>770 devices<br>...",
#           "nr.customEventSource": "customEventInserter",
#           "task": "harbourmaster",
#           "timestamp": 1561727131705,
#           "type": "extracts"
#         },

# {
#   "facets": [
#     {
#       "name": "workday",
#       "results": [
#         {
#           "latest": "================= extracts/workday/extract.sh =================<br>[<br>..."
#         },
#         {
#           "latest": 1563610682295
#         },
#         {
#           "latest": 2
#         },
#         {
#           "latest": 0.47420639
#         }
#       ]
#     }, ...
#   "metadata": {
#     ...
#     "contents": {
#       "messages": [],
#       "contents": [
#         {
#           "function": "latest",
#           "attribute": "log",
#           "simple": true
#         },
#         {
#           "function": "latest",
#           "attribute": "timestamp",
#           "simple": true
#         },
#         {
#           "function": "latest",
#           "attribute": "exitStatus",
#           "simple": true
#         },
#         {
#           "function": "latest",
#           "attribute": "elapsed",
#           "simple": true
#         }
#       ]
#     }
#   }
# }


def report e
  puts
  log = e["log"].split(/<br>/)
  puts "=" * log[0].length
  puts "#{Time.at e["timestamp"]/1000} exit #{e["exitStatus"]} after #{e["elapsed"].round(1)} sec"
  puts log.join "\n"
end

res = JSON.parse(STDIN.read)

events = if res['results']
  res['results'][0]['events']
elsif res['facets']
  keys = res['metadata']['contents']['contents'].map{|f|f['attribute']}
  events = res['facets'].map{|f|keys.zip(f['results'].map{|r|r['latest']}).to_h}
else
  STDERR.puts res
  STDERR.puts "expected results or facets, got #{res['results'].keys.inspect}"
  exit 1
end

events.sort_by{|v|v['timestamp']}.each do |e|
  report e
end
